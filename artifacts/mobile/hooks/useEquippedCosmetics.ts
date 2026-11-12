import {usePlayer} from '@/context/PlayerContext';
import {useCosmetics} from './useCosmetics';
import {artworkFor} from '@workspace/goldrush-catalog/cosmetics';
import {getWorkshop,useGetWorkshop} from '@workspace/api-client-react';
import {arenaRequestOptions,arenaProfileEpoch} from '@/utils/arenaSession';
export function useEquippedCosmetics(){
  const {profile,currentUsername}=usePlayer();
  const {state}=useCosmetics();
  const workshop=useGetWorkshop({query:{
    queryKey:['workshop',currentUsername,arenaProfileEpoch(currentUsername)],
    enabled:!!currentUsername,staleTime:30_000,retry:1,
    queryFn:async()=>getWorkshop(await arenaRequestOptions(currentUsername)),
  }}).data;
  const skin=state?.equippedSkin && state.equippedSkin!=='legacy'?state.equippedSkin:profile.currentSkin;
  return {
    artwork:state?.designs.find(d=>d.id===skin)??artworkFor(skin),
    arenaTheme:state?.equippedTheme && state.equippedTheme!=='legacy'?state.equippedTheme:profile.currentArenaTheme??'default',
    strikeEffect:state?.equippedStrike??'default',
    customCourt:workshop?.presets.find(p=>p.id===workshop.equippedCourtId)?.court,
    customHit:workshop?.presets.find(p=>p.id===workshop.equippedHitId)?.hit,
  };
}
