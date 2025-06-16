import { useRoute } from '@react-navigation/native';
import base64 from 'base-64';
import { InterfaceAbi } from 'ethers';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import Header from '../../components/Header';
import {
  useContractRead,
  useDeployedContractInfo
} from '../../hooks/eth-mobile';
import { COLORS } from '../../utils/constants';
import { WINDOW_WIDTH } from '../../utils/styles';
import Accessory from './modules/Accessory';

interface Metadata {
  name: string;
  image: string;
}

export default function Closet() {
  const route = useRoute();
  const { tokenId } = route.params as { tokenId: number };

  const [metadata, setMetadata] = useState<Metadata>();
  const [isLoading, setIsLoading] = useState(true);

  const { data: snowmanContract } = useDeployedContractInfo('Snowman');

  const { readContract } = useContractRead();

  const _getSnowmanMetadata = async () => {
    if (!snowmanContract) return;

    const tokenURI: string = await readContract({
      address: snowmanContract?.address,
      abi: snowmanContract?.abi as InterfaceAbi,
      functionName: 'tokenURI',
      args: [tokenId]
    });

    const metadata = JSON.parse(
      base64.decode(tokenURI.replace('data:application/json;base64,', ''))
    );
    const decodedMetadataImage = base64.decode(
      metadata.image.replace('data:image/svg+xml;base64,', '')
    );
    metadata.image = decodedMetadataImage;

    setMetadata(metadata);
  };

  const getSnowmanMetadata = async () => {
    if (!snowmanContract) return;

    try {
      setIsLoading(true);

      await _getSnowmanMetadata();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSnowmanMetadata();
  }, [snowmanContract]);

  const refresh = async () => {
    await _getSnowmanMetadata();
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={refresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <Header title={`Snowman #${tokenId}`} />

      <View style={styles.snowmanContainer}>
        {metadata && (
          <SvgXml
            xml={metadata.image}
            width={WINDOW_WIDTH * 0.6}
            height={WINDOW_WIDTH * 0.6}
          />
        )}
      </View>

      <Accessory
        name="Belt"
        snowman={{ address: snowmanContract?.address, id: tokenId }}
        onAddToSnowman={refresh}
      />
      <Accessory
        name="Hat"
        snowman={{ address: snowmanContract?.address, id: tokenId }}
        onAddToSnowman={refresh}
      />
      <Accessory
        name="Scarf"
        snowman={{ address: snowmanContract?.address, id: tokenId }}
        onAddToSnowman={refresh}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  snowmanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }
});
