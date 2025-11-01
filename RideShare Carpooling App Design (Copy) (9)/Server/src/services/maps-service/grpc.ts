import * as grpc from '@grpc/grpc-js';
import { MapsService } from './maps.service';
import { IMapsServer, MapsService as MapsGRPCService } from '../../proto/maps_grpc_pb';
import { GeocodeRequest, GeocodeResponse, ReverseGeocodeRequest, ReverseGeocodeResponse, GetRouteRequest, GetRouteResponse, Location } from '../../proto/maps_pb';

const mapsService = new MapsService();

const mapsServer: IMapsServer = {
  geocode: (call: grpc.ServerUnaryCall<GeocodeRequest, GeocodeResponse>, callback: grpc.sendUnaryData<GeocodeResponse>): void => {
    mapsService.geocode(call.request.getAddress())
      .then(location => {
        if (!location) {
          const error: grpc.ServiceError = new Error('Location not found.') as grpc.ServiceError;
          error.code = grpc.status.NOT_FOUND;
          callback(error, null);
          return;
        }
        const response = new GeocodeResponse();
        const loc = new Location();
        loc.setLat(location.location.lat);
        loc.setLng(location.location.lng);
        response.setLocation(loc);
        callback(null, response);
      })
      .catch((err: Error) => callback(err, null));
  },

  reverseGeocode: (call: grpc.ServerUnaryCall<ReverseGeocodeRequest, ReverseGeocodeResponse>, callback: grpc.sendUnaryData<ReverseGeocodeResponse>): void => {
    const location = call.request.getLocation();
    if (!location) {
      const error: grpc.ServiceError = new Error('Location is required.') as grpc.ServiceError;
      error.code = grpc.status.INVALID_ARGUMENT;
      callback(error, null);
      return;
    }

    mapsService.reverseGeocode({ lat: location.getLat(), lng: location.getLng(), address: '' })
      .then(address => {
        if (!address) {
          const error: grpc.ServiceError = new Error('Address not found.') as grpc.ServiceError;
          error.code = grpc.status.NOT_FOUND;
          callback(error, null);
          return;
        }
        const response = new ReverseGeocodeResponse();
        response.setAddress(address.address);
        callback(null, response);
      })
      .catch((err: Error) => callback(err, null));
  },

  getRoute: (call: grpc.ServerUnaryCall<GetRouteRequest, GetRouteResponse>, callback: grpc.sendUnaryData<GetRouteResponse>): void => {
    const start = call.request.getStart();
    const end = call.request.getEnd();

    if (!start || !end) {
      const error: grpc.ServiceError = new Error('Start and end locations are required.') as grpc.ServiceError;
      error.code = grpc.status.INVALID_ARGUMENT;
      callback(error, null);
      return;
    }

    mapsService.getRoute({ lat: start.getLat(), lng: start.getLng(), address: '' }, { lat: end.getLat(), lng: end.getLng(), address: '' })
      .then(route => {
        if (!route) {
          const error: grpc.ServiceError = new Error('Route not found.') as grpc.ServiceError;
          error.code = grpc.status.NOT_FOUND;
          callback(error, null);
          return;
        }
        const response = new GetRouteResponse();
        const path = route.path.map((p: any) => {
          const loc = new Location();
          loc.setLat(p.lat);
          loc.setLng(p.lng);
          return loc;
        });
        response.setPathList(path);
        response.setDistance(route.distance);
        response.setDuration(route.duration);
        callback(null, response);
      })
      .catch((err: Error) => callback(err, null));
  }
};

export const startGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(MapsGRPCService, mapsServer);
  server.bindAsync('0.0.0.0:50057', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error starting gRPC server for maps service: ${err.message}`);
      return;
    }
    console.log(`gRPC server for maps service listening on port ${port}`);
    server.start();
  });
};