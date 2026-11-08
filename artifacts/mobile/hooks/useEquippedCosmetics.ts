import {usePlayer} from '@/context/PlayerContext';
import {useCosmetics} from './useCosmetics';
import {artworkFor} from '@workspace/goldrush-catalog/cosmetics';
export function useEquippedCosmetics(){
  const {profile}=usePlayer();
  const {state}=useCosmetics();
  const skin=state?.equippedSkin && state.equippedSkin!=='legacy'?state.equippedSkin:profile.currentSkin;
  return {
    artwork:state?.designs.find(d=>d.id===skin)??artworkFor(skin),
    arenaTheme:state?.equippedTheme && state.equippedTheme!=='legacy'?state.equippedTheme:profile.currentArenaTheme??'default',
    strikeEffect:state?.equippedStrike??'default',
  };
}
