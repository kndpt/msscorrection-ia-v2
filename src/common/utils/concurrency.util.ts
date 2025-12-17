/**
 * Exécute des tâches asynchrones avec une concurrence limitée (pool dynamique).
 * Dès qu'une tâche se termine, la suivante démarre immédiatement.
 *
 * @param tasks - Tableau de fonctions qui retournent des Promises
 * @param concurrency - Nombre max de tâches simultanées
 * @returns Promise qui résout avec un tableau des résultats
 *
 * @example
 * const results = await processWithConcurrency(
 *   items.map(item => () => processItem(item)),
 *   20
 * );
 */
export async function processWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const [index, task] of tasks.entries()) {
    const promise = task().then((result) => {
      results[index] = result;
    });

    const executingPromise = promise.then(() => {
      executing.splice(executing.indexOf(executingPromise), 1);
    });

    executing.push(executingPromise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
