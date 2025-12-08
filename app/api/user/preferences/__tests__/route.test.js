import { DELETE } from '../route';
import { NextResponse } from 'next/server';
import UserPreference from '../../../../../models/UserPreference';
import dbConnect from '../../../../../lib/db';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('../../../../../lib/db');
jest.mock('../../../../../models/UserPreference');
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, options) => ({ json: async () => data, status: options?.status || 200 })),
    },
}));

describe('User Preferences API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DELETE', () => {
        it('should return 401 if not authenticated', async () => {
            getServerSession.mockResolvedValue(null);
            const response = await DELETE({});
            expect(response.status).toBe(401);
        });

        it('should delete preferences and return defaults', async () => {
            getServerSession.mockResolvedValue({ user: { id: 'user123' } });
            UserPreference.findOneAndDelete.mockResolvedValue(true);

            const response = await DELETE({});
            const data = await response.json();

            expect(dbConnect).toHaveBeenCalled();
            expect(UserPreference.findOneAndDelete).toHaveBeenCalledWith({ userId: 'user123' });
            expect(data.preferences).toEqual({
                groups: [],
                colorMap: {},
                hiddenEvents: [],
                theme: 'system',
                settings: {
                    showHolidays: true,
                    titleFormat: "{type} - {name}",
                    customNames: {},
                    typeMappings: {}
                }
            });
        });

        it('should handle database errors', async () => {
            getServerSession.mockResolvedValue({ user: { id: 'user123' } });
            UserPreference.findOneAndDelete.mockRejectedValue(new Error('DB Error'));

            const response = await DELETE({});
            expect(response.status).toBe(500);
        });
    });
});
