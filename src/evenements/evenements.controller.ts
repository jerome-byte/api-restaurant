import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { EvenementsService } from './evenements.service';

@Controller('evenements')
export class EvenementsController {
  constructor(private readonly evenementsService: EvenementsService) {}

  @Post()
  create(@Body() body: any) { return this.evenementsService.create(body); }

  @Get()
  findAll() { return this.evenementsService.findAll(); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.evenementsService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.evenementsService.delete(id); }
}