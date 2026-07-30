import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PlatsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_ANON_KEY')!,
    );
  }

  // CREATE
 async create(platData: any) {
    const { data, error } = await this.supabase
      .from('plats')
      .insert([platData])
      .select('*, categories(nom_fr, type)');

    if (error) throw error;
    return data;
}
  // READ ALL
  async findAll() {
    const { data, error } = await this.supabase
      .from('plats')
      .select('*, categories(nom_fr, type)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // UPDATE
  async update(id: string, platData: any) {
    const { data, error } = await this.supabase
      .from('plats')
      .update(platData)
      .eq('id', id)
      .select('*, categories(nom_fr, type)');

    if (error) throw error;
    return data;
  }

  // DELETE
  async delete(id: string) {
    const { error } = await this.supabase
      .from('plats')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: true };
  }
}