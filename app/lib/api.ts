// const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// export type ApiError = { 
//     status: "error"; 
//     message: string; 
//     errors?: Array<{ 
//         field: string; 
//         message: string; 
//     }>; 
// };

// export async function apiFetch<T>(
//     path: string,
//     options?: RequestInit,
// ): Promise<T> {
//     const response = await fetch(`${API_URL}${path}`, {
//         ...options,
//         credentials: "include",
//         headers: {
//             "Content-Type": "application/json",
//             ...options?.headers,
//         },
//     });

//     const data = await response.json().catch(() => null);

//     if (!response.ok) {
//         const error = data as ApiError | null;

//         throw new Error(
//             error?.message ?? `API request failed: ${response.status}`,
//         );
//     }

//     return data as T;
// }