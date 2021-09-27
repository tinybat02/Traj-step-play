import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { MapOptions, Frame, SingleData, StepData } from '../types';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { EventsKey } from 'ol/events';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import nanoid from 'nanoid';
import PlayBtn from './common/PlayBtn';
import PauseBtn from './common/PauseBtn';
import {
  processDataES,
  createTile,
  createSingleLineLayer,
  findClosest,
  createSinglePoint,
  // Sleep,
} from './utils/helpers';
// import { CustomSlider } from './common/CustomSlider';
import 'ol/ol.css';
import '../style/MainPanel.css';

interface Props extends PanelProps<MapOptions> {}

interface State {
  iterRoute: number;
  routeLength: number;
  isPlaying: boolean;
}

export class MainPanel extends PureComponent<Props> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  deviceData: {
    deviceRoute: [number, number][];
    deviceTime: number[];
    deviceUncertainty: number[];
    deviceFloor: number[];
  } | null = null;
  stepData: { stepRoute: [number, number][]; stepTime: number[] } | null = null;
  partialRoute: VectorLayer;
  partialStep: VectorLayer;
  listener: EventsKey | undefined;
  t: number;

  state: State = {
    iterRoute: 0,
    routeLength: 0,
    isPlaying: false,
  };

  componentDidMount() {
    const { zoom_level, center_lon, center_lat } = this.props.options;

    const carto = createTile('https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');

    const min = fromLonLat([center_lon - 0.02, center_lat - 0.02]);

    const max = fromLonLat([center_lon + 0.02, center_lat + 0.02]);
    const extent = [...min, ...max] as [number, number, number, number];

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
        extent,
      }),
      target: this.id,
    });

    if (this.props.data.series.length < 2) return;

    const series = this.props.data.series as Frame[];

    let bufferRaw: SingleData[] = [];
    let bufferStep: StepData[] = [];

    series.forEach(serie => {
      if (serie.fields[0].values.buffer[0].hash_id) bufferRaw = serie.fields[0].values.buffer;
      if (serie.fields[0].values.buffer[0].device_id) bufferStep = serie.fields[0].values.buffer;
    });

    if (bufferRaw.length < 2) return;

    const { deviceData, stepData } = processDataES(bufferRaw, bufferStep);

    this.deviceData = deviceData;
    this.stepData = stepData;

    this.setState({ routeLength: deviceData.deviceRoute.length });

    if (this.deviceData.deviceRoute.length < 2) return;

    const { deviceRoute, deviceTime, deviceFloor } = this.deviceData;
    const { stepRoute, stepTime } = this.stepData;
    const { other_floor, tile_url, tile_other } = this.props.options;

    if (tile_url) {
      let url = tile_url;

      if (deviceFloor[1] == other_floor) url = tile_other;

      this.randomTile = createTile(url);
      this.map.addLayer(this.randomTile);
    }

    this.partialRoute = createSingleLineLayer(
      deviceRoute[0],
      deviceRoute[1],
      deviceFloor[0] == other_floor,
      deviceFloor[1] == other_floor,
      `${deviceTime[1] - deviceTime[0]}s`
    );

    const idx = findClosest(deviceTime[0], stepTime);
    this.partialStep = createSinglePoint(stepRoute[idx]);
    this.map.addLayer(this.partialRoute);
    this.map.addLayer(this.partialStep);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      this.map.removeLayer(this.partialRoute);
      this.map.removeLayer(this.randomTile);

      this.setState({ iterRoute: 0, routeLength: 0, isPlaying: false });

      if (this.props.data.series.length < 2) {
        this.deviceData = null;
        this.stepData = null;
        return;
      }

      const series = this.props.data.series as Frame[];

      let bufferRaw: SingleData[] = [];
      let bufferStep: StepData[] = [];

      series.forEach(serie => {
        if (serie.fields[0].values.buffer[0].hash_id) bufferRaw = serie.fields[0].values.buffer;
        if (serie.fields[0].values.buffer[0].device_id) bufferStep = serie.fields[0].values.buffer;
      });

      if (bufferRaw.length < 2) return;

      const { deviceData, stepData } = processDataES(bufferRaw, bufferStep);

      this.deviceData = deviceData;
      this.stepData = stepData;

      this.setState({ routeLength: deviceData.deviceRoute.length });

      if (this.deviceData.deviceRoute.length < 2) return;

      const { deviceRoute, deviceTime, deviceFloor } = this.deviceData;
      const { stepRoute, stepTime } = this.stepData;
      const { other_floor, tile_url, tile_other } = this.props.options;

      if (tile_url) {
        let url = tile_url;

        if (deviceFloor[1] == other_floor) url = tile_other;

        this.randomTile = createTile(url);
        this.map.addLayer(this.randomTile);
      }

      this.partialRoute = createSingleLineLayer(
        deviceRoute[0],
        deviceRoute[1],
        deviceFloor[0] == other_floor,
        deviceFloor[1] == other_floor,
        `${deviceTime[1] - deviceTime[0]}s`
      );

      const idx = findClosest(deviceTime[0], stepTime);
      this.partialStep = createSinglePoint(stepRoute[idx]);
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });

    if (prevState.iterRoute !== this.state.iterRoute) {
      if (!this.deviceData || !this.stepData) return;

      const prevIter = prevState.iterRoute;
      const value = this.state.iterRoute;

      const { deviceRoute, deviceTime, deviceFloor } = this.deviceData;
      const { stepRoute, stepTime } = this.stepData;
      const { other_floor, tile_url, tile_other } = this.props.options;

      this.map.removeLayer(this.partialRoute);
      this.map.removeLayer(this.partialStep);

      if (
        (value < prevIter && deviceFloor[value + 1] !== deviceFloor[value + 2]) ||
        (value > prevIter && deviceFloor[value] !== deviceFloor[value + 1])
      ) {
        this.map.removeLayer(this.randomTile);
        let url = tile_url;
        if (deviceFloor[value + 1] == other_floor) url = tile_other;

        this.randomTile = createTile(url);
        this.map.addLayer(this.randomTile);
      }

      this.partialRoute = createSingleLineLayer(
        deviceRoute[value],
        deviceRoute[value + 1],
        deviceFloor[value] == other_floor,
        deviceFloor[value + 1] == other_floor,
        `${deviceTime[value + 1] - deviceTime[value]}s`
      );
      this.map.addLayer(this.partialRoute);

      const idx = findClosest(deviceTime[value], stepTime);
      this.partialStep = createSinglePoint(stepRoute[idx]);
      this.map.addLayer(this.partialStep);
    }
  }

  handleIterRoute = (type: string) => () => {
    const { iterRoute, routeLength } = this.state;
    if ((type == 'previous' && iterRoute <= 0) || (type == 'next' && iterRoute >= routeLength)) return;

    let newIter = 0;
    if (type == 'previous') newIter = iterRoute - 1;
    if (type == 'next') newIter = iterRoute + 1;

    this.setState({ iterRoute: newIter });
  };

  onSliding = (value: number) => {
    this.setState({ iterRoute: value });
  };

  onSlider = (value: number) => {};

  handleSearch = (record: { key: string; value: string }) => {
    this.setState({ current: record.key });
  };

  onPlay = async () => {
    const { routeLength, isPlaying, iterRoute } = this.state;
    this.setState({ isPlaying: !isPlaying });

    if (isPlaying) window.clearInterval(this.t);

    if (!isPlaying && iterRoute < routeLength - 2) {
      this.t = window.setInterval(() => {
        if (this.state.iterRoute < routeLength - 2) this.setState({ iterRoute: this.state.iterRoute + 1 });
        else {
          window.clearInterval(this.t);
          this.setState({ iterRoute: 0, isPlaying: false });
        }
      }, 350);
    }
  };

  render() {
    const { width, height } = this.props;
    const { iterRoute, routeLength, isPlaying } = this.state;

    return (
      <div
        style={{
          width,
          height,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            zIndex: 10,
            background: '#fff',
            padding: '3px 5px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ marginRight: 5 }}>{`${iterRoute}/${routeLength > 2 ? routeLength - 2 : 0}`}</span>
          <div
            style={{
              padding: 5,
              border: '1px solid #444',
              borderRadius: 3,
            }}
            onClick={this.onPlay}
          >
            {isPlaying ? <PauseBtn /> : <PlayBtn />}
          </div>
        </div>

        <div
          id={this.id}
          style={{
            width: '100%',
            height: '100%',
          }}
        ></div>
      </div>
    );
  }
}
