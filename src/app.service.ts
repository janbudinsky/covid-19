import { HttpException, HttpService, Injectable } from '@nestjs/common';
import { CountryDataDto } from "./dto/CountryDataDto";
import { Observable } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { DailyDataColumnIndexesDto } from "./dto/DailyDataColumnIndexesDto";
import { OverviewDto } from "./dto/OverviewDto";

@Injectable()
export class AppService {
  constructor(
    private httpService: HttpService,
  ) {}

  private datesToCountriesData: Map<string, Array<CountryDataDto>> = new Map();
  private static quotationMarkRegex = new RegExp('"', 'g');

  /**
   * Get overview with summary of yesterday's numbers.
   */
  getOverview() {
    const dateString = AppService.getYesterdayDateString();
    const allCountries = this.getDailyValues(dateString);
    if (allCountries instanceof Array) {
      return AppService.reduceDailyDataIntoOverview(allCountries);
    } else {
      return allCountries.pipe(
        map(allCountries => AppService.reduceDailyDataIntoOverview(allCountries)),
      );
    }
  }

  /**
   * Get yesterday's data for given country.
   */
  getCurrentDailyValuesForCountry(country: string) {
    const dateString = AppService.getYesterdayDateString();
    return this.getDailyValuesForCountry(country, dateString);
  }

  /**
   * Get data for given country on given day.
   *
   * @param country
   * @param dateString date in YYYY-MM-DD format
   */
  getDailyValuesForCountry(country: string, dateString: string) {
    const lowerCaseCountry = country.toLowerCase();
    const allCountries = this.getDailyValues(dateString);
    if (allCountries instanceof Array) {
      return allCountries.find(countryData => countryData.countryregion.toLowerCase() == lowerCaseCountry);
    } else {
      return allCountries.pipe(
        map(allCountries => allCountries.find(countryData => countryData.countryregion.toLowerCase() == lowerCaseCountry))
      );
    }
  }

  /**
   * Get yesterday's data for all countries.
   */
  getCurrentDailyValues(): Array<CountryDataDto> | Observable<Array<CountryDataDto>> {
    const dateString = AppService.getYesterdayDateString();
    return this.getDailyValues(dateString);
  }

  /**
   * Get data for all countries for given day.
   *
   * @param dateString date in YYYY-MM-DD format
   */
  getDailyValues(dateString: string): Array<CountryDataDto> | Observable<Array<CountryDataDto>> {
    const storedDailyData = this.datesToCountriesData.get(dateString);
    if (storedDailyData) {
      return storedDailyData;
    }
    const dataObservable = this.getDailyCSVData(dateString);
    return dataObservable.pipe(
      map(
        data => {
          const dailyData = AppService.parseDailyData(data);
          this.datesToCountriesData.set(dateString, dailyData);
          return dailyData;
        }
      ),
    );
  }

  private static reduceDailyDataIntoOverview(data: Array<CountryDataDto>): OverviewDto {
    const overview: OverviewDto = {
      confirmed: 0,
      deaths: 0,
      recovered: 0
    };
    return data.reduce<OverviewDto>(
      (sum, countryData) => {
        return {
          confirmed: sum.confirmed + countryData.confirmed,
          deaths: sum.deaths + countryData.deaths,
          recovered: sum.recovered + countryData.recovered
        };
      },
      overview
    )
  }

  private static parseDailyData(data: string): Array<CountryDataDto> {
    const rows = data.split('\n');
    const topRow = rows[0].split(',');
    const dataIndexes = this.getDailyDataIndexesDto(topRow);
    // data have granularity of individual regions, merge them all into one country, since that's the only decomposition level for geographical data
    const countriesToData: Map<string, CountryDataDto> = new Map();
    for (const rowString of rows.slice(1)) {  // iterate rows except the top one
      const metaRowString = rowString.replace(', ', '@');  // little hack to avoid issues with things like "Korea, South"
      const row = metaRowString.split(',');
      if (row.length < 8) {
        continue;  // broken row or empty row at the end of the file
      }
      const country = row[dataIndexes.countryRegion].replace('@', ', ').replace(this.quotationMarkRegex, '');
      const countryData = countriesToData.get(country);
      if (countryData) {
        const lastUpdate = row[dataIndexes.lastUpdate];
        // merge data for a province into its country data
        countriesToData.set(country, {
          provincestate: countryData.provincestate === row[dataIndexes.provinceState] ? countryData.provincestate : '',
          countryregion: country,
          lastUpdate: lastUpdate > countryData.lastUpdate ? lastUpdate : countryData.lastUpdate,
          confirmed: countryData.confirmed + Number(row[dataIndexes.confirmed]),
          deaths: countryData.deaths + Number(row[dataIndexes.deaths]),
          recovered: countryData.recovered + Number(row[dataIndexes.recovered]),
          latitude: (lastUpdate > countryData.lastUpdate) ? Number(row[dataIndexes.latitude]) : countryData.latitude,
          longitude: (lastUpdate > countryData.lastUpdate) ? Number(row[dataIndexes.longitude]) : countryData.longitude,
        });
      } else {
        countriesToData.set(country, {
          provincestate: row[dataIndexes.provinceState],
          countryregion: country,
          lastUpdate: row[dataIndexes.lastUpdate],
          confirmed: Number(row[dataIndexes.confirmed]),
          deaths: Number(row[dataIndexes.deaths]),
          recovered: Number(row[dataIndexes.recovered]),
          latitude: Number(row[dataIndexes.latitude]),
          longitude: Number(row[dataIndexes.longitude]),
        });
      }
    }
    return Array.from(countriesToData.values());
  }

  private getDailyCSVData(dateString: string): Observable<string> {
    const url = AppService.buildDailyFileUrl(dateString);
    return this.httpService.get(url).pipe(
      map(response => response.data),
      catchError(e => {
        if (e.response.status == 404) {
          throw new HttpException(`Requested data for ${dateString} (MM-DD-YYYY) not found.`, e.response.status);
        }
        throw new HttpException(e.response.data, e.response.status);
      }),
    );
  }

  /**
   * Get indexes of relevant columns.
   * The data structure has changed and might change in the future again, which is why there are multiple options.
   *
   * @param topRow: top row split into columns
   */
  private static getDailyDataIndexesDto(topRow: Array<string>): DailyDataColumnIndexesDto {
    const provinceStateIndex = topRow.indexOf('Province_State');
    const countryRegionIndex = topRow.indexOf('Country_Region');
    const lastUpdateIndex = topRow.indexOf('Last_Update');
    const confirmedIndex = topRow.indexOf('Confirmed');
    const deathsIndex = topRow.indexOf('Deaths');
    const recoveredIndex = topRow.indexOf('Recovered');
    const latitudeIndex = topRow.indexOf('Lat');
    const longitudeIndex = topRow.indexOf('Long_');
    return {
      provinceState: (provinceStateIndex !== -1) ? provinceStateIndex : topRow.indexOf('Province/State'),
      countryRegion: (countryRegionIndex !== -1) ? countryRegionIndex : topRow.indexOf('Country/Region'),
      lastUpdate: (lastUpdateIndex !== -1) ? lastUpdateIndex : topRow.indexOf('Last Update'),
      confirmed: confirmedIndex,
      deaths: deathsIndex,
      recovered: recoveredIndex,
      latitude: (latitudeIndex !== -1) ? latitudeIndex : topRow.indexOf('Latitude'),
      longitude: (longitudeIndex !== -1) ? longitudeIndex : topRow.indexOf('Longitude'),
    };
  }

  /**
   * Build URL for retrieval of CSV file with daily data.
   *
   * @param dateString date in YYYYMMDD format.
   */
  private static buildDailyFileUrl(dateString: string): string {
    const yyyyMmDd = dateString.split('-');
    const urlDate = `${yyyyMmDd[1]}-${yyyyMmDd[2]}-${yyyyMmDd[0]}`;  // mm-dd-yyyy
    return `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${urlDate}.csv`;
  }

  /**
   * Get date string in YYYY-MM-DD format for yesterday.
   * Reason for using yesterday is that the data for current day are updated between 3:30 - 4:00 am next day.
   */
  private static getYesterdayDateString(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }
}
