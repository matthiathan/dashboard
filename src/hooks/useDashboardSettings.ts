import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Destination {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  baseRoute: string;
}

const getRouteSuggestion = (lat: number, lng: number) => {
  const isNorth = lat < -25.9964;
  const isEast = lng > 28.1306;
  if (isNorth && isEast) return "N1 Northbound → R21 Expressway";
  if (isNorth && !isEast) return "N1 Northbound → N14 West";
  if (!isNorth && isEast) return "M1 Southbound → N3 Eastern Bypass";
  return "M1 Southbound → N1 Western Bypass";
};

const DEFAULT_DESTINATIONS: Destination[] = [
  {
    id: 'northwold',
    name: 'Northwold Gardens',
    address: 'Randburg, Gauteng',
    lat: -26.0728,
    lng: 27.9545,
    baseRoute: 'N1 Western Bypass → Beyers Naudé'
  },
  {
    id: 'roodekrans',
    name: '1237 Anemone Str',
    address: 'Roodekrans, Roodepoort',
    lat: -26.1139,
    lng: 27.8446,
    baseRoute: 'N1 Western Bypass → Hendrik Potgieter'
  }
];

export function useDashboardSettings() {
  const [destList, setDestList] = useState<Destination[]>(DEFAULT_DESTINATIONS);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionAndLoadSettings = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          return;
        }
        
        const uId = session.user.id;
        setUserId(uId);

        const { data, error: dbError } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('user_id', uId)
          .maybeSingle();

        if (dbError) {
          console.warn('Could not load customized traffic slots from state database:', dbError);
          return;
        }

        if (data) {
          setDestList(prev => {
            const nextList = [...prev];
            if (data.node_1_name) {
              nextList[0] = {
                ...nextList[0],
                name: data.node_1_name,
                address: data.node_1_name, // Sync address with custom geocoded search name
                lat: data.node_1_lat != null ? Number(data.node_1_lat) : nextList[0].lat,
                lng: data.node_1_lng != null ? Number(data.node_1_lng) : nextList[0].lng,
                baseRoute: getRouteSuggestion(
                  data.node_1_lat != null ? Number(data.node_1_lat) : nextList[0].lat,
                  data.node_1_lng != null ? Number(data.node_1_lng) : nextList[0].lng
                )
              };
            }
            if (data.node_2_name) {
              nextList[1] = {
                ...nextList[1],
                name: data.node_2_name,
                address: data.node_2_name, // Sync address with custom geocoded search name
                lat: data.node_2_lat != null ? Number(data.node_2_lat) : nextList[1].lat,
                lng: data.node_2_lng != null ? Number(data.node_2_lng) : nextList[1].lng,
                baseRoute: getRouteSuggestion(
                  data.node_2_lat != null ? Number(data.node_2_lat) : nextList[1].lat,
                  data.node_2_lng != null ? Number(data.node_2_lng) : nextList[1].lng
                )
              };
            }
            return nextList;
          });
        }
      } catch (err) {
        console.error('Failure in reading settings state telemetry:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndLoadSettings();

    // Listen to auth changes to fetch correct user settings
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setDestList(DEFAULT_DESTINATIONS);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch settings whenever userId updates
  useEffect(() => {
    if (!userId) return;
    const loadSettingsForUser = async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn('Could not load settings for user', userId, error);
          return;
        }

        if (data) {
          setDestList(prev => {
            const nextList = [...prev];
            if (data.node_1_name) {
              nextList[0] = {
                ...nextList[0],
                name: data.node_1_name,
                address: data.node_1_name,
                lat: data.node_1_lat != null ? Number(data.node_1_lat) : nextList[0].lat,
                lng: data.node_1_lng != null ? Number(data.node_1_lng) : nextList[0].lng,
                baseRoute: getRouteSuggestion(
                  data.node_1_lat != null ? Number(data.node_1_lat) : nextList[0].lat,
                  data.node_1_lng != null ? Number(data.node_1_lng) : nextList[0].lng
                )
              };
            }
            if (data.node_2_name) {
              nextList[1] = {
                ...nextList[1],
                name: data.node_2_name,
                address: data.node_2_name,
                lat: data.node_2_lat != null ? Number(data.node_2_lat) : nextList[1].lat,
                lng: data.node_2_lng != null ? Number(data.node_2_lng) : nextList[1].lng,
                baseRoute: getRouteSuggestion(
                  data.node_2_lat != null ? Number(data.node_2_lat) : nextList[1].lat,
                  data.node_2_lng != null ? Number(data.node_2_lng) : nextList[1].lng
                )
              };
            }
            return nextList;
          });
        }
      } catch (err) {
        console.error('Error fetching settings on user update', err);
      }
    };
    loadSettingsForUser();
  }, [userId]);

  const updateNodeLocation = async (nodeIndex: number, newName: string, lat: number, lng: number) => {
    const baseRoute = getRouteSuggestion(lat, lng);
    
    // 1. Optimistic UI Update in React State
    let resolvedList: Destination[] = [];
    setDestList(prev => {
      const nextList = prev.map((dest, idx) => {
        if (idx === nodeIndex) {
          return {
            ...dest,
            name: newName,
            address: newName,
            lat,
            lng,
            baseRoute
          };
        }
        return dest;
      });
      resolvedList = nextList;
      return nextList;
    });

    // 2. Async database write in the background
    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        activeUserId = session?.user?.id || null;
      }

      if (!activeUserId) {
        console.warn('Upsert cancelled: No authenticated operations session found.');
        return;
      }

      // Fetch the most updated nodes to upsert, referencing resolvedList
      // Just in case resolvedList is empty, compute directly
      const node1 = nodeIndex === 0 ? { name: newName, lat, lng } : { name: destList[0].name, lat: destList[0].lat, lng: destList[0].lng };
      const node2 = nodeIndex === 1 ? { name: newName, lat, lng } : { name: destList[1].name, lat: destList[1].lat, lng: destList[1].lng };

      const { error: upsertError } = await supabase
        .from('dashboard_settings')
        .upsert({
          user_id: activeUserId,
          node_1_name: node1.name,
          node_1_lat: node1.lat,
          node_1_lng: node1.lng,
          node_2_name: node2.name,
          node_2_lat: node2.lat,
          node_2_lng: node2.lng
        });

      if (upsertError) {
        console.error('Error upserting dashboard settings telemetry slots:', upsertError);
      }
    } catch (err) {
      console.error('Tactical map setting persist failure:', err);
    }
  };

  return {
    destList,
    updateNodeLocation,
    loading,
    userId
  };
}
