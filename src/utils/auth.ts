import { auth } from "@/config/firebase";
import { formatPlayerName } from "@/shared/utils";

export interface PlayerInfo {
    uid: string;
    name: string;
    picture: string;
}

export const getPlayerInfo = async (token: string): Promise<PlayerInfo> => {
    const playerInfo = await auth.verifyIdToken(token);
    return {
        uid: playerInfo.uid,
        name: formatPlayerName(playerInfo["name"] || playerInfo.email || `Player-${playerInfo.uid.slice(-6)}`),
        picture: playerInfo.picture || "",
    };
};
