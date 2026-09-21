import type { JSX } from 'react';
import {
  CARACOL_COSMETIC_SLOTS,
  type CaracolCosmeticSlot,
  type CaracolCosmeticWearer,
  type CaracolOutfit,
  type CaracolStateView,
} from '../shared/caracol';
import { CaracolMedallion } from './CaracolAvatar';
import { caracolShopItemTone } from './caracolArt/model';

// A gaveta da loja fica fora de CaracolGame.tsx, que abre o socket no import,
// para poder ser renderizada nos testes.

export function CosmeticAvatar({ wearer, outfit, size, label }: { wearer: CaracolCosmeticWearer; outfit: CaracolOutfit; size: 'tiny' | 'small' | 'medium' | 'large'; label: string }): JSX.Element {
  return <span className={`cosmetic-avatar cosmetic-avatar-${wearer} cosmetic-avatar-${size}`} role="img" aria-label={label}>
    <span className="cosmetic-avatar-shadow" />
    {wearer === 'snail' ? <>
      <span className="cosmetic-snail-shell" />
      <span className="cosmetic-snail-body" />
      <span className="cosmetic-snail-eye cosmetic-snail-eye-left" />
      <span className="cosmetic-snail-eye cosmetic-snail-eye-right" />
      <span className="cosmetic-snail-antenna cosmetic-snail-antenna-left" />
      <span className="cosmetic-snail-antenna cosmetic-snail-antenna-right" />
    </> : <>
      <span className="cosmetic-human-head" />
      <span className={`cosmetic-layer cosmetic-shirt ${outfit.shirt ?? 'default'}`} />
      <span className={`cosmetic-layer cosmetic-pants ${outfit.pants ?? 'default'}`} />
    </>}
    {wearer === 'snail' && <>
      <span className={`cosmetic-layer cosmetic-shirt ${outfit.shirt ?? 'default'}`} />
      <span className={`cosmetic-layer cosmetic-pants ${outfit.pants ?? 'default'}`} />
    </>}
    {outfit.watch && <span className={`cosmetic-layer cosmetic-watch ${outfit.watch}`} />}
    {outfit.glasses && <span className={`cosmetic-layer cosmetic-glasses ${outfit.glasses}`} />}
    {outfit.cap && <span className={`cosmetic-layer cosmetic-cap ${outfit.cap}`} />}
  </span>;
}

export interface CaracolShopDrawerProps {
  state: CaracolStateView;
  open: boolean;
  tab: CaracolCosmeticWearer;
  onTabChange: (tab: CaracolCosmeticWearer) => void;
  onClose: () => void;
  onPurchase: (itemId: string) => void;
  onEquip: (slot: CaracolCosmeticSlot, itemId: string | null) => void;
}

export function CaracolShopDrawer({ state, open, tab, onTabChange, onClose, onPurchase, onEquip }: CaracolShopDrawerProps): JSX.Element {
  const wardrobe = tab === 'player' ? state.shop.player : state.shop.snail;
  const title = tab === 'player' ? 'Seu guarda-roupa' : 'O guarda-roupa do caracol';
  const description = tab === 'player'
    ? 'Peças compradas ficam para sempre na sua conta.'
    : 'Este visual é global. Todo mundo vê a mesma roupa no mapa.';
  return <aside id="caracol-shop-drawer" className={`caracol-shop-drawer ${open ? 'is-open' : ''}`} aria-label="Loja de cosméticos" aria-hidden={!open}>
    <div className="caracol-shop-head">
      <div><span className="micro-label">Loja de cosméticos</span><h2>{title}</h2><p>{description}</p></div>
      <button className="caracol-history-close" type="button" onClick={onClose} aria-label="Fechar loja">×</button>
    </div>
    <div className="caracol-shop-tabs" role="tablist" aria-label="Guarda-roupa">
      <button type="button" role="tab" aria-selected={tab === 'player'} className={tab === 'player' ? 'active' : ''} onClick={() => onTabChange('player')}><CosmeticAvatar wearer="player" outfit={state.shop.player.outfit} size="tiny" label="Seu personagem" /><span>Você</span></button>
      <button type="button" role="tab" aria-selected={tab === 'snail'} className={tab === 'snail' ? 'active' : ''} onClick={() => onTabChange('snail')}><CosmeticAvatar wearer="snail" outfit={state.shop.snail.outfit} size="tiny" label="Caracol" /><span>Caracol</span></button>
    </div>
    <div className="caracol-shop-preview paper-card">
      <CosmeticAvatar wearer={tab} outfit={wardrobe.outfit} size="large" label={tab === 'player' ? 'Seu personagem vestido' : 'Caracol vestido'} />
      <div><span className="micro-label">Visual atual</span><strong>{tab === 'player' ? state.you.nickname : 'Caracol global'}</strong><p>{wardrobe.ownedItemIds.length} de {state.shop.catalog.length} peças desbloqueadas</p></div>
    </div>
    <div className="caracol-shop-body">
      {CARACOL_COSMETIC_SLOTS.map((slot) => {
        const items = state.shop.catalog.filter((item) => item.slot === slot);
        const equipped = wardrobe.outfit[slot];
        return <section className="caracol-shop-section" key={slot} aria-labelledby={`shop-slot-${slot}`}>
          <div className="caracol-shop-section-head"><div><span className="micro-label">Categoria</span><h3 id={`shop-slot-${slot}`}>{cosmeticSlotLabel(slot)}</h3></div>{equipped && <button className="shop-clear-button" type="button" onClick={() => onEquip(slot, null)}>Tirar</button>}</div>
          <div className="caracol-shop-grid">{items.map((item) => {
            const owned = wardrobe.ownedItemIds.includes(item.id);
            const isEquipped = equipped === item.id;
            const previewOutfit: CaracolOutfit = { ...wardrobe.outfit, [slot]: item.id };
            return <article className={`caracol-shop-item ${isEquipped ? 'is-equipped' : ''}`} key={item.id}>
              <div className="caracol-shop-item-preview"><CaracolMedallion wearer={tab} outfit={previewOutfit} crop={slot} size={88} tone={caracolShopItemTone({ owned, equipped: isEquipped, coins: state.you.coins, price: item.price })} label={`${item.name} para ${tab === 'player' ? 'você' : 'o caracol'}`} /></div>
              <div className="caracol-shop-item-copy"><strong>{item.name}</strong><span>{owned ? isEquipped ? 'Equipado' : 'Desbloqueado' : `${item.price} moedas`}</span></div>
              {isEquipped ? <button className="shop-item-button is-equipped" type="button" disabled>Equipado</button> : owned ? <button className="shop-item-button" type="button" onClick={() => onEquip(slot, item.id)}>Usar</button> : <button className="shop-item-button shop-item-buy" type="button" onClick={() => onPurchase(item.id)} disabled={state.you.coins < item.price}>Comprar <span>{item.price}</span></button>}
            </article>;
          })}</div>
        </section>;
      })}
    </div>
  </aside>;
}

function cosmeticSlotLabel(slot: CaracolCosmeticSlot): string {
  const labels: Record<CaracolCosmeticSlot, string> = { pants: 'Calças', shirt: 'Camisas', watch: 'Relógios', glasses: 'Óculos', cap: 'Bonés' };
  return labels[slot];
}
