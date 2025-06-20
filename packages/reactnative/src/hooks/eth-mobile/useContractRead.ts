import { Contract, InterfaceAbi, JsonRpcProvider, Wallet } from 'ethers';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAccount, useNetwork } from '.';
import { Account } from '../../store/reducers/Wallet';

interface UseContractReadConfig {
  abi?: InterfaceAbi;
  address?: string;
  functionName?: string;
  args?: any[];
  enabled?: boolean;
  onError?: (error: any) => void;
}

interface ReadContractConfig {
  abi: InterfaceAbi;
  address: string;
  functionName: string;
  args?: any[];
}

export function useContractRead({
  abi,
  address,
  functionName,
  args,
  enabled = true,
  onError
}: Partial<UseContractReadConfig> = {}) {
  const network = useNetwork();
  const connectedAccount = useAccount();
  const wallet = useSelector((state: any) => state.wallet);

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<any>(null);

  async function fetchData() {
    if (!abi || !address || !functionName) {
      console.warn(
        'Missing required parameters: abi, address, or functionName'
      );
      return;
    }

    try {
      setIsLoading(true);
      const provider = new JsonRpcProvider(network.provider);

      const activeAccount = wallet.accounts.find(
        (account: Account) =>
          account.address.toLowerCase() ===
          connectedAccount.address.toLowerCase()
      );

      const activeWallet = new Wallet(activeAccount.privateKey, provider);

      const contract = new Contract(address, abi, activeWallet);

      const result = await contract[functionName](...(args || []));

      if (error) {
        setError(null);
      }
      setData(result);

      return result;
    } catch (error) {
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function readContract({
    abi,
    address,
    functionName,
    args
  }: ReadContractConfig) {
    try {
      setIsLoading(true);
      const provider = new JsonRpcProvider(network.provider);

      const activeAccount = wallet.accounts.find(
        (account: Account) =>
          account.address.toLowerCase() ===
          connectedAccount.address.toLowerCase()
      );

      const activeWallet = new Wallet(activeAccount.privateKey, provider);

      const contract = new Contract(address, abi, activeWallet);

      const result = await contract[functionName](...(args || []));

      return result;
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    readContract
  };
}
