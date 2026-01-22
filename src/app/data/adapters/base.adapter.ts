/**
 * Interfaz base para adaptadores.
 * Los adaptadores transforman datos entre diferentes capas de la aplicación:
 * - API Response -> Domain Model
 * - Domain Model -> View Model
 * - Form Data -> API Request
 *
 * @template TSource Tipo de origen
 * @template TTarget Tipo de destino
 */
export interface Adapter<TSource, TTarget> {
	/**
	 * Transforma un objeto de origen a destino
	 */
	adapt(source: TSource): TTarget;
}

/**
 * Interfaz para adaptadores bidireccionales
 *
 * @template TSource Tipo de origen
 * @template TTarget Tipo de destino
 */
export interface BidirectionalAdapter<TSource, TTarget> extends Adapter<TSource, TTarget> {
	/**
	 * Transforma un objeto de destino a origen (inversa)
	 */
	reverse(target: TTarget): TSource;
}

/**
 * Clase base abstracta para adaptadores con funcionalidad común
 */
export abstract class BaseAdapter<TSource, TTarget> implements Adapter<TSource, TTarget> {
	abstract adapt(source: TSource): TTarget;

	/**
	 * Adapta una lista de objetos
	 */
	adaptList(sources: TSource[]): TTarget[] {
		return sources.map((source) => this.adapt(source));
	}

	/**
	 * Adapta un objeto nullable
	 */
	adaptOrNull(source: TSource | null | undefined): TTarget | null {
		return source ? this.adapt(source) : null;
	}
}

/**
 * Clase base para adaptadores bidireccionales
 */
export abstract class BaseBidirectionalAdapter<TSource, TTarget>
	extends BaseAdapter<TSource, TTarget>
	implements BidirectionalAdapter<TSource, TTarget>
{
	abstract reverse(target: TTarget): TSource;

	/**
	 * Reversa una lista de objetos
	 */
	reverseList(targets: TTarget[]): TSource[] {
		return targets.map((target) => this.reverse(target));
	}
}
