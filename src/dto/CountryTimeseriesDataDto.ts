import { SeriesEntryDto } from "./SeriesEntryDto";

export class CountryTimeseriesDataDto {
  provincestate: string;
  countryregion: string;
  lat: number;
  long: number;
  series: Array<SeriesEntryDto>;
}
