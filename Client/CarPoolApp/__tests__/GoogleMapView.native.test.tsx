import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import GoogleMapView from '../components/GoogleMapView.native';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
}));

jest.mock('react-native-maps', () => {
  // Jest requires dependencies used by a mock factory to be loaded inside the factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const MockMapView = React.forwardRef((props: { children?: React.ReactNode }, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
    }));
    return props.children ?? null;
  });
  MockMapView.displayName = 'MockMapView';

  return {
    __esModule: true,
    default: MockMapView,
    Marker: () => null,
    Polyline: () => null,
    PROVIDER_GOOGLE: 'google',
  };
});

describe('GoogleMapView native server-owned routes', () => {
  const pickupLocation = { latitude: 23.8103, longitude: 90.4125 };
  const dropoffLocation = { latitude: 23.7806, longitude: 90.4070 };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('does not call Google Directions when client directions are disabled', async () => {
    render(
      <GoogleMapView
        center={pickupLocation}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        showDirections={false}
      />
    );

    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled());
  });
});
