import { DataFrame, Field, Vector as VectorData } from '@grafana/data';
export interface MapOptions {
  center_lat: number;
  center_lon: number;
  tile_url: string;
  tile_other: string;
  zoom_level: number;
  other_floor: number;
  showRadius: boolean;
}

export const defaults: MapOptions = {
  center_lat: 48.262725,
  center_lon: 11.66725,
  tile_url: '',
  tile_other: '',
  zoom_level: 18,
  other_floor: 1,
  showRadius: true,
};

export interface SingleData {
  latitude: number;
  longitude: number;
  hash_id: string;
  timestamp: number;
  [key: string]: any;
}

export interface StepData {
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface Buffer extends VectorData {
  buffer: any;
}

export interface FieldBuffer extends Field<any, VectorData> {
  values: Buffer;
}

export interface Frame extends DataFrame {
  fields: FieldBuffer[];
}
