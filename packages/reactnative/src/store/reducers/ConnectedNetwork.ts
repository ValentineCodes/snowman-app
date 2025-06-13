import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import ethmobileConfig, { Network } from '../../../ethmobile.config';

const initialState: Network = Object.values(ethmobileConfig.networks)[0];

export const connectedNetworkSlice = createSlice({
  name: 'CONNECTED_NETWORK',
  initialState,
  reducers: {
    switchNetwork: (state, action: PayloadAction<number>) => {
      const newNetwork = Object.values(ethmobileConfig.networks).find(
        network => network.id === action.payload
      );

      return newNetwork ? newNetwork : state;
    }
  }
});

export const { switchNetwork } = connectedNetworkSlice.actions;
export default connectedNetworkSlice.reducer;
