/**
 * Base interface for storage layers
 * Each layer (local, remote) implements this interface
 */
export interface IStorageLayer {
  /** Unique identifier for this layer */
  readonly name: string

  /** Priority level (higher = preferred for reads) */
  readonly priority: number

  /** Whether this layer supports reads */
  readonly canRead: boolean

  /** Whether this layer supports writes */
  readonly canWrite: boolean

  /** Whether this layer is currently available */
  isAvailable(): Promise<boolean>
}
