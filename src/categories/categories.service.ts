import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CategoriesService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_ANON_KEY')!,
    );
  }

  async create(data: any) {
    const { res, error } = await this.supabase.from('categories').insert([data]).select();
    if (error) throw error;
    return res;
  }

  async findAll() {
    const { data, error } = await this.supabase.from('categories').select('*').order('ordre_affichage', { ascending: true });
    if (error) throw error;
    return data;
  }

  async update(id: string, data: any) {
    const { res, error } = await this.supabase.from('categories').update(data).eq('id', id).select();
    if (error) throw error;
    return res;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}