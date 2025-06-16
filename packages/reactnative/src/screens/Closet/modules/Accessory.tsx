import base64 from 'base-64';
import { ethers, InterfaceAbi } from 'ethers';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { SvgXml } from 'react-native-svg';
import { useToast } from 'react-native-toast-notifications';
import {
  useAccount,
  useContractRead,
  useDeployedContractInfo,
  useScaffoldContractWrite
} from '../../../hooks/eth-mobile';
import globalStyles from '../../../styles/globalStyles';
import { COLORS } from '../../../utils/constants';
import { FONT_SIZE, WINDOW_WIDTH } from '../../../utils/styles';

type Props = {
  name: string;
  snowman: {
    address: string | undefined;
    id: number;
  };
  onAddToSnowman: () => void;
};

export default function Accessory({ name, snowman, onAddToSnowman }: Props) {
  const [accessories, setAccessories] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const { address: connectedAccount } = useAccount();

  const { data: accessoryContract } = useDeployedContractInfo(name);

  const { readContract } = useContractRead();
  const { write } = useScaffoldContractWrite({
    contractName: name,
    functionName: 'safeTransferFrom',
    gasLimit: 500000n
  });

  const toast = useToast();

  const _getAccessories = async () => {
    if (!accessoryContract) return;

    const balance = Number(
      await readContract({
        abi: accessoryContract.abi as InterfaceAbi,
        address: accessoryContract.address,
        functionName: 'balanceOf',
        args: [connectedAccount]
      })
    );

    const tokenURIs = [];
    for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
      try {
        const tokenId = await readContract({
          abi: accessoryContract.abi as InterfaceAbi,
          address: accessoryContract.address,
          functionName: 'tokenOfOwnerByIndex',
          args: [connectedAccount, tokenIndex]
        });

        const tokenURI = await readContract({
          abi: accessoryContract.abi as InterfaceAbi,
          address: accessoryContract.address,
          functionName: 'tokenURI',
          args: [tokenId]
        });

        const metadata = JSON.parse(
          base64.decode(tokenURI.replace('data:applicaton/json;base64,', ''))
        );

        const decodedMetadataImage = base64.decode(
          metadata.image.replace('data:image/svg+xml;base64,', '')
        );
        metadata.image = decodedMetadataImage;

        tokenURIs.push({ id: tokenId, ...metadata });
      } catch (error) {
        console.error(error);
      }
    }
    setAccessories(tokenURIs);
  };

  const getAccessories = async () => {
    if (!accessoryContract) return;
    setIsLoading(true);

    await _getAccessories();

    setIsLoading(false);
  };

  const addToSnowman = async (tokenId: number) => {
    if (!accessoryContract || !snowman.address || isComposing) return;

    setIsComposing(true);

    try {
      const encodedSnowmanId = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [snowman.id]
      );

      await write({
        args: [connectedAccount, snowman.address, tokenId, encodedSnowmanId]
      });

      toast.show(`Added ${name} to Snowman`, { type: 'success' });
      onAddToSnowman();
      _getAccessories();
    } catch (error) {
      console.log(error);
      toast.show(JSON.stringify(error), { type: 'danger' });
    } finally {
      setIsComposing(false);
    }
  };

  useEffect(() => {
    getAccessories();
  }, [accessoryContract]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {name} {isComposing && <ActivityIndicator size={FONT_SIZE.sm} />}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.accessoriesContainer}
          showsHorizontalScrollIndicator={false}
          horizontal
        >
          {accessories?.map(accessory => (
            <Pressable
              key={accessory.id}
              style={styles.accessory}
              onPress={() => addToSnowman(Number(accessory.id))}
            >
              <SvgXml
                xml={accessory.image}
                width={WINDOW_WIDTH * 0.4}
                height={WINDOW_WIDTH * 0.4}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10
  },
  accessoriesContainer: {
    gap: 10,
    marginTop: 10
  },
  accessory: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10
  },
  title: {
    fontSize: FONT_SIZE.lg,
    ...globalStyles.textSemiBold,
    marginBottom: -5
  }
});
