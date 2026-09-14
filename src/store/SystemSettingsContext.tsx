import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface SystemSettings {
  logisticsEnabled: boolean;
  deliveriesEnabled: boolean;
  notificationsEnabled: boolean;
  aiReportsEnabled: boolean;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (partial: Partial<SystemSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: SystemSettings = {
  logisticsEnabled: true,
  deliveriesEnabled: true,
  notificationsEnabled: true,
  aiReportsEnabled: true,
};

const STORAGE_KEY = 'systemSettings';

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

const readStoredSettings = (): SystemSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      logisticsEnabled: parsed?.logisticsEnabled !== false,
      deliveriesEnabled: parsed?.deliveriesEnabled !== false,
      notificationsEnabled: parsed?.notificationsEnabled !== false,
      aiReportsEnabled: parsed?.aiReportsEnabled !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => readStoredSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SystemSettingsContextType>(() => ({
    settings,
    updateSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
    resetSettings: () => setSettings(DEFAULT_SETTINGS),
  }), [settings]);

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
};
