import { postRequest } from "./ApiRequest";
import { ENDPOINTS } from "./Endpoints";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: any;
  message?: string;
}

export const loginUser = (payload: LoginPayload) => {
  return postRequest<LoginResponse>(ENDPOINTS.USER_LOGIN, payload);
};

export type StartVoiceCallResponse = {
  success: boolean;
  message?: string;
  data?: {
    session_id: string;
    room_name: string;
    livekit_url: string;
    access_token: string;
    participant_identity?: string;
  };
};

export const startVoiceCall = () => {
  return postRequest<StartVoiceCallResponse>(ENDPOINTS.VOICE_CALL);
};
