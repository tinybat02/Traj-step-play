import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Circle from 'ol/geom/Circle';
import { Stroke, Style, Fill, Icon, Text } from 'ol/style';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { SingleData, StepData } from '../../types';
import Arrow from '../../img/arrow.png';
import Arrow1 from '../../img/arrow1.png';

export const findClosest = (num: number, arr: number[]) => {
  var mid;
  var lo = 0;
  var hi = arr.length - 1;
  while (hi - lo > 1) {
    mid = Math.floor((lo + hi) / 2);
    if (arr[mid] < num) lo = mid;
    else hi = mid;
  }
  // if (num - arr[lo] <= arr[hi] - num) return arr[lo];

  // return arr[hi];
  if (num - arr[lo] <= arr[hi] - num) return lo;

  return hi;
};

export const processDataES = (data: SingleData[], stepData: StepData[]) => {
  data.reverse();
  const deviceRoute: [number, number][] = [];
  const deviceTime: number[] = [];
  const deviceUncertainty: number[] = [];
  const deviceFloor: number[] = [];

  data.map(datum => {
    deviceRoute.push([datum.longitude, datum.latitude]);
    deviceTime.push(datum.timestamp);
    deviceUncertainty.push(datum.uncertainty);
    deviceFloor.push(datum.floor);
  });

  stepData.reverse();

  const stepRoute: [number, number][] = [];
  const stepTime: number[] = [];

  stepData.map(d => {
    stepRoute.push([d.longitude, d.latitude]);
    stepTime.push(d.timestamp);
  });

  return {
    deviceData: { deviceRoute, deviceTime, deviceUncertainty, deviceFloor },
    stepData: { stepRoute, stepTime },
  };
};

export const createTile = (url: string) => {
  return new TileLayer({
    source: new XYZ({
      url,
    }),
    zIndex: 1,
  });
};

export const createTotalLine = (deviceRoute: [number, number][], deviceFloor: number[], other_floor: number) => {
  const lineFeatures: Feature[] = [];
  const isInOtherFloor = deviceFloor.map(floor => floor == other_floor);

  for (let i = 0; i < deviceRoute.length - 1; i++) {
    lineFeatures.push(createSingleLine(deviceRoute[i], deviceRoute[i + 1], isInOtherFloor[i], isInOtherFloor[i + 1]));
  }

  return new VectorLayer({
    source: new VectorSource({
      features: lineFeatures,
    }),
    zIndex: 2,
  });
};

const createSingleLine = (
  start: [number, number],
  end: [number, number],
  lineInOtherF = false,
  endInOtherF = false,
  label = ''
) => {
  let color = 'rgba(73,168,222)';
  let icon = Arrow;

  if (lineInOtherF) color = 'rgba(255,176,0,0.6)';
  if (endInOtherF) icon = Arrow1;

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const rotation = Math.atan2(dy, dx);

  const lineFeature = new Feature(new LineString([start, end]).transform('EPSG:4326', 'EPSG:3857'));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
      text: new Text({
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
        font: '18px Calibri,sans-serif',
        text: label,
      }),
    }),
    new Style({
      geometry: new Point(end).transform('EPSG:4326', 'EPSG:3857'),
      image: new Icon({
        src: icon,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotation,
      }),
    }),
  ]);
  return lineFeature;
};

export const createSingleLineLayer = (
  start: [number, number],
  end: [number, number],
  lineInOtherF = false,
  endInOtherF = false,
  label = ''
) => {
  return new VectorLayer({
    source: new VectorSource({
      features: [createSingleLine(start, end, lineInOtherF, endInOtherF, label)],
    }),
    zIndex: 3,
  });
};

export const createSinglePoint = (coordinate: [number, number]) => {
  const pointFeature = new Feature(new Circle(fromLonLat(coordinate), 3));
  pointFeature.setStyle(
    new Style({
      fill: new Fill({ color: 'rgba(255,255,255,0.9)' }),
      stroke: new Stroke({
        color: '#444',
        width: 2,
      }),
    })
  );

  return new VectorLayer({
    source: new VectorSource({
      features: [pointFeature],
    }),
    zIndex: 2,
  });
};

export function Sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
