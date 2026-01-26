import { api } from '../services/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  const mockToken = 'test-token-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    api.setToken(mockToken);
  });

  describe('GET requests', () => {
    it('should fetch rides successfully', async () => {
      const mockRides = [
        { id: '1', origin: 'A', destination: 'B' },
        { id: '2', origin: 'C', destination: 'D' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRides,
      });

      const rides = await api.get('/rides');

      expect(rides).toEqual(mockRides);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rides'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should handle 404 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(api.get('/invalid')).rejects.toThrow();
    });
  });

  describe('POST requests', () => {
    it('should create ride successfully', async () => {
      const newRide = { origin: 'A', destination: 'B', departureTime: '2024-01-01' };
      const createdRide = { id: '1', ...newRide };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createdRide,
      });

      const result = await api.post('/rides', newRide);

      expect(result).toEqual(createdRide);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rides'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newRide),
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should update ride successfully', async () => {
      const updates = { status: 'active' };
      const updatedRide = { id: '1', origin: 'A', destination: 'B', status: 'active' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRide,
      });

      const result = await api.put('/rides/1', updates);

      expect(result).toEqual(updatedRide);
    });
  });

  describe('DELETE requests', () => {
    it('should delete ride successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await api.delete('/rides/1');

      expect(result).toEqual({ success: true });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(api.get('/rides')).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.get('/rides')).rejects.toThrow();
    });
  });
});
