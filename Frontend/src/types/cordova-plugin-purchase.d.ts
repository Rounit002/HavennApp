/**
 * Minimal TypeScript declarations for cordova-plugin-purchase (v13.x)
 * Only covers the subset we plan to use in Havenn.
 */

// Global namespace exposed by the plugin
declare namespace CdvPurchase {
  /** Supported product types (subset). */
  enum ProductType {
    AUTO_RENEWABLE_SUBSCRIPTION = 'AUTO_RENEWABLE_SUBSCRIPTION',
  }

  /** Supported platforms (subset). */
  enum Platform {
    GOOGLE_PLAY = 'GOOGLE_PLAY',
  }

  /** Transaction states (subset). */
  enum TransactionState {
    APPROVED = 'APPROVED',
    FINISHED = 'FINISHED',
    PENDING = 'PENDING',
  }

  /** Pricing information (simplified). */
  interface Pricing {
    price?: string; // localized price (e.g., "$4.99")
    priceMicros?: number; // price in micros (e.g., 4990000)
    currency?: string; // ISO 4217, e.g., "USD"
  }

  /** One phase of pricing for an offer (simplified). */
  interface PricingPhase extends Pricing {
    billingPeriod?: string; // ISO 8601 period, e.g., "P1M"
    recurrenceMode?: number | string; // plugin-defined
  }

  /** Offer for a product (subset). */
  interface Offer {
    id: string;
    pricingPhases?: PricingPhase[];
    order(): Promise<void> | void;
  }

  /** Product definition (subset). */
  interface Product {
    id: string;
    title?: string;
    description?: string;
    pricing?: Pricing;
    owned?: boolean;
    offers?: Offer[];
  }

  /** A transaction/purchase event (subset). */
  interface Transaction {
    products: Product[];
    purchaseToken?: string;
    state: TransactionState;
    verify?: () => Promise<void> | void;
    finish?: () => Promise<void> | void;
  }

  /** Product registration shape. */
  interface ProductRegistration {
    id: string;
    type: ProductType;
    platform: Platform;
  }

  /** Event chain helper returned by store.when (subset). */
  interface WhenChain {
    approved(cb: (tx: Transaction) => void): WhenChain | void;
    verified?(cb: (tx: Transaction) => void): WhenChain | void;
    finished(cb: (tx: Transaction) => void): WhenChain | void;
    pending?(cb: (tx: Transaction) => void): WhenChain | void;
    productUpdated?(cb: (p: Product) => void): WhenChain | void;
  }

  /** Store interface (subset of public API). */
  interface Store {
    /** Register one or more products. */
    register(products: ProductRegistration[] | ProductRegistration): void | Promise<void>;

    /** Initialize the store. Resolves when ready to use. */
    initialize(platforms?: Platform[] | Platform): Promise<void> | void;

    /** Retrieve a product by id (optionally for a specific platform). */
    get(id: string, platform?: Platform): Product | undefined;

    /** Event subscription helper. */
    when(query?: unknown): WhenChain;

    /** Place an order for an offer or product id. */
    order(offerOrProductId: string | Offer | Product): Promise<void> | void;

    /** Mark a transaction as finished/consumed. */
    finish(transaction: Transaction): Promise<void> | void;
  }

  /** The main store singleton. */
  const store: Store;
}

// Make the namespace available on window
declare global {
  interface Window {
    CdvPurchase?: typeof CdvPurchase;
  }
}

export {}; // ensure this file is treated as a module so global augments are applied

