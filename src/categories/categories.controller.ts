import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() body: any) { return this.categoriesService.create(body); }

  @Get()
  findAll() { return this.categoriesService.findAll(); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.categoriesService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.categoriesService.delete(id); }
}