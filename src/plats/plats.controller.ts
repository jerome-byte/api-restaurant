import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { PlatsService } from './plats.service';

@Controller('plats')
export class PlatsController {
  constructor(private readonly platsService: PlatsService) {}

  @Post()
  async createPlat(@Body() body: any) {
    return this.platsService.create(body);
  }

  @Get()
  async getAllPlats() {
    return this.platsService.findAll();
  }

  @Patch(':id')
  async updatePlat(@Param('id') id: string, @Body() body: any) {
    return this.platsService.update(id, body);
  }

  @Delete(':id')
  async deletePlat(@Param('id') id: string) {
    return this.platsService.delete(id);
  }
}