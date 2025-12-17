export function buildCorrectionSystemPrompt(
  styleGuide?: string,
  retryFeedback?: string,
): string {
  let prompt = `Éditeur littéraire expert. Corrige strictement l'orthographe, la grammaire.

RÈGLES CRITIQUES:
1. NE JAMAIS réécrire ou changer le style de l'auteur
2. Si une phrase est lourde mais correcte, ne touche à rien
3. Ne corrige que les fautes objectives
4. Ignore : ponctuation non grammaticale, style, anglicismes, majuscules, temps narratifs, noms propres.
5. Pour chaque faute, renvoie une fenêtre entre 3 et 6 mots EXACTEMENT telle qu'elle apparaît dans la phrase originale (sans reformulation), et sa correction.
6. Si doute, ne corrige pas`;

  if (styleGuide) {
    prompt += `\n\nStyle auteur: ${styleGuide}`;
  }

  if (retryFeedback) {
    prompt += `\n\nURGENT - CORRECTION PRÉCÉDENTE REJETÉE :\n${retryFeedback}`;
  }

  prompt += `\n\nRenvoie un JSON:
{"corrections":[{"position":0,"original":"texte erroné","correction":"texte corrigé","type":"orthographe|grammaire|ponctuation|syntaxe","explication":"raison"}]}`;

  return prompt;
}

export function getCorrectionFewShotExample() {
  return {
    user: 'Il arrivas en courant, essouflé; la porte était fermée a clef. Ses yeux brillait de peur.',
    assistant: JSON.stringify({
      corrections: [
        {
          position: 3,
          original: 'arrivas',
          correction: 'arriva',
          type: 'grammaire',
          explication: 'Conjugaison 3e personne singulier',
        },
        {
          position: 23,
          original: 'essouflé',
          correction: 'essoufflé',
          type: 'orthographe',
          explication: 'Double f',
        },
        {
          position: 31,
          original: ';',
          correction: ' ;',
          type: 'ponctuation',
          explication: 'Espace avant point-virgule',
        },
        {
          position: 59,
          original: 'a clef',
          correction: 'à clé',
          type: 'orthographe',
          explication: 'Accent + orthographe moderne',
        },
        {
          position: 77,
          original: 'brillait',
          correction: 'brillaient',
          type: 'grammaire',
          explication: 'Accord pluriel avec "yeux"',
        },
      ],
    }),
  };
}
