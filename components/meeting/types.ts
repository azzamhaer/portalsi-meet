import { TrackReferenceOrPlaceholder } from '@livekit/components-react';

export interface MeetingProps {
  roomId: string;
  token: string;
  wsUrl: string;
  name: string;
  isHost: boolean;
  password?: string;
  onLeave: () => void;
  initialMic?: boolean;
  initialCam?: boolean;
  hasMicError?: boolean;
  hasCamError?: boolean;
}

export interface ShellProps {
  roomId: string;
  isHost: boolean;
  password?: string;
  onLeave: () => void;
}

export type PanelType = 'chat' | 'participants' | 'info' | 'settings' | 'view' | 'whiteboard' | null;
