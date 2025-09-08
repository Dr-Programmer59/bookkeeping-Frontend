import { useState, useCallback } from 'react';
import { AxiosResponse, AxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
  } = options;

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiCall(...args);
        setData(response.data);

        if (showSuccessToast) {
          toast({
            title: 'Success',
            description: successMessage,
          });
        }

        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        const errorMessage = 
          axiosError.response?.data?.message || 
          axiosError.message || 
          'An error occurred';

        setError(errorMessage);

        if (showErrorToast) {
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiCall, showSuccessToast, showErrorToast, successMessage, toast]
  );

  return {
    data,
    loading,
    error,
    execute,
    setData,
    setError,
  };
}