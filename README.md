### COVID-19 data provider

A simple app for a university project serving [COVID-19 data](https://github.com/CSSEGISandData/COVID-19) via HTTP API.

#### Setup
The app is based on [NestJS](http://nestjs.com/) framework:
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="80" alt="Nest Logo" /></a>
</p>

```bash
npm i -g @nestjs/cli
```
To run the app use:
```bash
npm run start
```

#### Endpoints

##### [GET] /brief
Get summary of yesterday's figures.
 
##### [GET] /countries
Retrieve daily data for all countries.
 
**Query params**
- *date* (optional): YYYY-MM-DD format; day for which the data will be obtained (yesterday if not given) 

##### [GET] /countries/:country
Retrieve daily data for given country.
 
**Query params**
- *date* (optional): YYYY-MM-DD format; day for which the data will be obtained (yesterday if not given) 

##### [GET] /timeseries
Obtain daily confirmed cases numbers history.
 
**Query params**
- *country* (optional): country for which the data will be obtained (all countries if not given) 
