import React, { useState, useEffect, useCallback } from 'react';
import { Mission } from '../types';
import * as firebaseService from '../services/firebaseService';
import { LoadingSpinner } from './icons';

interface HistoryPanelProps {
    onSelectMission: (missionId: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onSelectMission }) => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (firebaseService.isConfigured()) {
                const fetchedMissions = await firebaseService.getMissions();
                setMissions(fetchedMissions);
            } else {
                setError("Firebase is not configured.");
            }
        } catch (e) {
            setError("Failed to fetch missions.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMissions();
    }, [fetchMissions]);

    const getStatusChip = (status: Mission['status']) => {
        const baseClasses = "px-1 py-0.5 text-xs font-bold rounded-full";
        switch (status) {
            case 'completed':
                return `${baseClasses} bg-green-500/20 text-green-300`;
            case 'running':
                return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
            case 'error':
                return `${baseClasses} bg-red-500/20 text-red-300`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-300`;
        }
    };

    return (
        <div className="h-full flex flex-col p-1">
            {loading && (
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner className="w-6 h-6 text-violet-400" />
                </div>
            )}
            {error && (
                <div className="text-center text-yellow-400 p-2 text-xs">{error}</div>
            )}
            {!loading && !error && (
                <div className="space-y-2 overflow-y-auto">
                    {missions.length === 0 ? (
                        <p className="text-gray-500 text-center italic text-xs">No saved missions found.</p>
                    ) : (
                        missions.map(mission => (
                            <button
                                key={mission.id}
                                onClick={() => onSelectMission(mission.id)}
                                className="w-full text-left p-2 bg-gray-900/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition space-y-1"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-semibold text-gray-400">
                                        {mission.createdAt.toLocaleString()}
                                    </p>
                                    <span className={getStatusChip(mission.status)}>{mission.status}</span>
                                </div>
                                <h4 className="font-bold text-sm text-violet-300 truncate">{mission.objective}</h4>
                                <p className="text-xs text-gray-500 truncate">{mission.githubUrl}</p>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
