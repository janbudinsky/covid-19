import { Controller, Get, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService
  ) {}

  @Get('/brief')
  getOverview() {
    return this.appService.getOverview();
  }

  @Get('/countries')
  getData(
    @Query('date') dateString: string
  ) {
    if (dateString) {
      return this.appService.getDailyValues(dateString);
    } else {
      return this.appService.getCurrentDailyValues();
    }
  }

  @Get('/countries/:country')
  getDataForCountry(
    @Param('country') country: string,
    @Query('date') dateString: string
  ) {
    if (dateString) {
      return this.appService.getDailyValuesForCountry(country, dateString);
    } else {
      return this.appService.getCurrentDailyValuesForCountry(country);
    }
  }

  @Get('/timeseries')
  getTimeseriesData(
    @Query('country') country: string
  ) {
    if (country) {
      return this.appService.getTimeseriesDataForCountry(country);
    } else {
      return this.appService.getTimeseriesData();
    }
  }

  @Get('/final')
  getNameAndRating() {
    return {
      name: "Budinsky",
      rating: 4
    }
  }
}
