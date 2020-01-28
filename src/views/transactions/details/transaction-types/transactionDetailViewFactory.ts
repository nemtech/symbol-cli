/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {Transaction, TransactionType} from 'nem2-sdk';

import {
 AccountMetadataView,
 AccountRestrictionAddressView,
 AccountRestrictionMosaicView,
 AccountRestrictionOperationView,
 AddressAliasView,
 AggregateBondedView,
 AggregateCompleteView,
 LinkAccountView,
 LockView,
 ModifyMultisigAccountView,
 MosaicAddressRestrictionView,
 MosaicAliasView,
 MosaicDefinitionView,
 MosaicGlobalRestrictionView,
 MosaicMetadataView,
 MosaicSupplyChangeView,
 NamespaceMetadataView,
 RegisterNamespaceView,
 SecretLockView,
 SecretProofView,
 TransferView,
} from '.';
import {CellRecord} from '../transaction.view';

/**
 * @param  {Transaction} transaction
 * @returns {CellRecord}
 */
export const transactionDetailViewFactory = (tx: Transaction): CellRecord => {
 try {
  const type: TransactionType = tx.type;

  if (type === TransactionType.RESERVED) {
   throw new Error('The transaction type can not be reserved');
  }

  const formatters: Record<TransactionType, any> = {
   [TransactionType.RESERVED]: {},
   [TransactionType.TRANSFER]: TransferView,
   [TransactionType.REGISTER_NAMESPACE]: RegisterNamespaceView,
   [TransactionType.ADDRESS_ALIAS]: AddressAliasView,
   [TransactionType.MOSAIC_ALIAS]: MosaicAliasView,
   [TransactionType.MOSAIC_DEFINITION]: MosaicDefinitionView,
   [TransactionType.MOSAIC_SUPPLY_CHANGE]: MosaicSupplyChangeView,
   [TransactionType.MODIFY_MULTISIG_ACCOUNT]: ModifyMultisigAccountView,
   [TransactionType.AGGREGATE_COMPLETE]: AggregateCompleteView,
   [TransactionType.AGGREGATE_BONDED]: AggregateBondedView,
   [TransactionType.LOCK]: LockView,
   [TransactionType.SECRET_LOCK]: SecretLockView,
   [TransactionType.SECRET_PROOF]: SecretProofView,
   [TransactionType.ACCOUNT_RESTRICTION_ADDRESS]: AccountRestrictionAddressView,
   [TransactionType.ACCOUNT_RESTRICTION_MOSAIC]: AccountRestrictionMosaicView,
   [TransactionType.ACCOUNT_RESTRICTION_OPERATION]: AccountRestrictionOperationView,
   [TransactionType.LINK_ACCOUNT]: LinkAccountView,
   [TransactionType.MOSAIC_ADDRESS_RESTRICTION]: MosaicAddressRestrictionView,
   [TransactionType.MOSAIC_GLOBAL_RESTRICTION]: MosaicGlobalRestrictionView,
   [TransactionType.ACCOUNT_METADATA_TRANSACTION]: AccountMetadataView,
   [TransactionType.MOSAIC_METADATA_TRANSACTION]: MosaicMetadataView,
   [TransactionType.NAMESPACE_METADATA_TRANSACTION]: NamespaceMetadataView,
  };

  const formatter = formatters[type];
  return formatter.get(tx);
 } catch (error) {
  throw new Error(`Transaction type not found: ${tx.type}`);
 }
};
