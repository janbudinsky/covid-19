import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService
  ) {}

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
}
