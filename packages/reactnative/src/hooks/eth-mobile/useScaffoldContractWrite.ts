import {
  Contract,
  formatEther,
  InterfaceAbi,
  JsonRpcProvider,
  Wallet
} from 'ethers';
import { useModal } from 'react-native-modalfy';
import { useToast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';
import { Address, TransactionReceipt } from 'viem';
import {
  useAccount,
  useDeployedContractInfo,
  useNetwork,
  useTransactions
} from '.';
import { Account } from '../../store/reducers/Wallet';
import { parseFloat } from '../../utils/eth-mobile';

interface UseScaffoldWriteConfig {
  contractName: string;
  functionName: string;
  args?: any[];
  value?: BigInt | undefined;
  blockConfirmations?: number | undefined;
  gasLimit?: BigInt | undefined;
}

interface SendTxConfig {
  args?: any[] | undefined;
  value?: BigInt | undefined;
}

/**
 * This returns a function which returns the transaction receipt after contract call
 * @param config - The config settings
 * @param config.contractName - deployed contract name
 * @param config.functionName - name of the function to be called
 * @param config.args - arguments for the function
 * @param config.value - value in ETH that will be sent with transaction
 * @param config.blockConfirmations - number of block confirmations to wait for (default: 1)
 * @param config.gasLimit - transaction gas limit
 */

export function useScaffoldContractWrite({
  contractName,
  functionName,
  args,
  value,
  blockConfirmations,
  gasLimit
}: UseScaffoldWriteConfig) {
  const writeArgs = args;
  const writeValue = value;

  const { openModal } = useModal();
  const { data: deployedContractData } = useDeployedContractInfo(contractName);
  const network = useNetwork();
  const toast = useToast();
  const connectedAccount = useAccount();
  const wallet = useSelector((state: any) => state.wallet);

  const { addTx } = useTransactions();
  /**
   *
   * @param config Optional param settings
   * @param config.args - arguments for the function
   * @param config.value - value in ETH that will be sent with transaction
   * @returns The transaction receipt
   */
  const sendTransaction = async (
    config: SendTxConfig = {
      args: undefined,
      value: undefined
    }
  ): Promise<TransactionReceipt> => {
    const { args, value } = config;
    const _args = args || writeArgs || [];
    const _value = value || writeValue || 0n;
    const _gasLimit = gasLimit || 1000000;

    if (!deployedContractData) {
      throw new Error(
        'Target Contract is not deployed, did you forget to run `yarn deploy`?'
      );
    }

    return new Promise(async (resolve, reject) => {
      try {
        const provider = new JsonRpcProvider(network.provider);
        const activeAccount = wallet.accounts.find(
          (account: Account) =>
            account.address.toLowerCase() ===
            connectedAccount.address.toLowerCase()
        );

        const activeWallet = new Wallet(activeAccount.privateKey, provider);
        const contract = new Contract(
          deployedContractData.address,
          deployedContractData.abi as InterfaceAbi,
          activeWallet
        );

        openModal('SignTransactionModal', {
          contract,
          contractAddress: deployedContractData.address,
          functionName,
          args: _args,
          value: _value,
          gasLimit: _gasLimit,
          onConfirm,
          onReject
        });
      } catch (error) {
        reject(error);
      }

      function onReject() {
        reject('Transaction Rejected!');
      }

      async function onConfirm() {
        try {
          const provider = new JsonRpcProvider(network.provider);
          const activeAccount = wallet.accounts.find(
            (account: Account) =>
              account.address.toLowerCase() ===
              connectedAccount.address.toLowerCase()
          );

          const activeWallet = new Wallet(activeAccount.privateKey, provider);
          const contract = new Contract(
            deployedContractData!.address,
            deployedContractData!.abi as InterfaceAbi,
            activeWallet
          );

          const tx = await contract[functionName](..._args, {
            value: _value,
            gasLimit: _gasLimit
          });
          const receipt = await tx.wait(blockConfirmations || 1);

          // Add transaction to Redux store
          const gasFee = receipt?.gasUsed
            ? receipt.gasUsed * receipt.gasPrice
            : 0n;
          const transaction = {
            type: 'contract',
            title: `${functionName}`,
            hash: tx.hash,
            value: parseFloat(formatEther(tx.value), 8).toString(),
            timestamp: Date.now(),
            from: tx.from as Address,
            to: tx.to as Address,
            nonce: tx.nonce,
            gasFee: parseFloat(formatEther(gasFee), 8).toString(),
            total: parseFloat(formatEther(tx.value + gasFee), 8).toString()
          };

          // @ts-ignore
          addTx(transaction);

          toast.show('Transaction Successful!', {
            type: 'success'
          });
          resolve(receipt);
        } catch (error) {
          reject(error);
        }
      }
    });
  };

  return {
    write: sendTransaction
  };
}
