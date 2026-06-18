import { Controller, Get } from "@nestjs/common";
import { MapOpportunitiesService } from "./map-opportunities.service";

@Controller("map")
export class MapOpportunitiesController {
  constructor(private readonly mapOpportunitiesService: MapOpportunitiesService) {}

  @Get("opportunities")
  findAll() {
    return this.mapOpportunitiesService.findAll();
  }
}
