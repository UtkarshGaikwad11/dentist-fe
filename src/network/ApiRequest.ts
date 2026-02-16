import axiosClient from "./ApiClient";

export const getRequest = async <T>(url: string): Promise<T> => {
  const res = await axiosClient.get<T>(url);
  return res.data;
};

export const postRequest = async <T>(url: string, payload?: any): Promise<T> => {
  const res = await axiosClient.post<T>(url, payload);
  return res.data;
};

export const putRequest = async <T>(url: string, payload?: any): Promise<T> => {
  const res = await axiosClient.put<T>(url, payload);
  return res.data;
};

export const deleteRequest = async <T>(url: string): Promise<T> => {
  const res = await axiosClient.delete<T>(url);
  return res.data;
};

export const patchRequest = async <T>(url: string, payload?: any): Promise<T> => {
  const res = await axiosClient.patch<T>(url, payload);
  return res.data;
};
