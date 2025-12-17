import { Injectable } from '@nestjs/common';
import { TokenUsage } from '../../common/types';

@Injectable()
export class TokenUsageService {
  private totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  /**
   * Ajoute l'usage d'une requête au total global
   */
  addUsage(usage: TokenUsage) {
    this.totalUsage.promptTokens += usage.promptTokens;
    this.totalUsage.completionTokens += usage.completionTokens;
    this.totalUsage.totalTokens += usage.totalTokens;
  }

  /**
   * Récupère le total accumulé
   */
  getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  /**
   * Réinitialise les compteurs (utile pour les tests ou nouveau job si singleton par request)
   * Note: Dans notre cas actuel, le service est singleton global, donc on pourrait vouloir gérer par JobId plus tard.
   * Pour l'instant, on va garder simple et reset manuellement si besoin, ou juste accumuler.
   * Mieux: on retourne l'usage accumulé pour le job courant via une méthode dédiée si on passait le jobId.
   * Ici on va rester simple : on accumule tout.
   */
  reset() {
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }
}
