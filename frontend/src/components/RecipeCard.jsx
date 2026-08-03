// frontend/src/components/RecipeCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LazyImage from './LazyImage';

const RecipeCard = React.memo(({ recipe }) => {
  const { t } = useTranslation();

  const getNutritionLabel = () => {
    const parts = [];
    if (recipe.proteini) parts.push(`💪 ${recipe.proteini}g`);
    if (recipe.vlakna) parts.push(`🌾 ${recipe.vlakna}g`);
    if (recipe.ugljikohidrati) parts.push(`🍞 ${recipe.ugljikohidrati}g`);
    if (recipe.masti) parts.push(`🧈 ${recipe.masti}g`);
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const nutritionLabel = getNutritionLabel();

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100 dark:border-gray-700 group"
    >
      <LazyImage
        src={recipe.slika || 'https://via.placeholder.com/300x200'}
        alt={recipe.naziv}
        className="w-full h-48 group-hover:scale-105 transition duration-300"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg dark:text-white line-clamp-1">
          {recipe.naziv}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ⏱️ {recipe.vrijeme} · 🔥 {recipe.kalorije} {t('recipe.kcal')}
        </p>

        {nutritionLabel && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {nutritionLabel}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.premium && (
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-semibold">
              ⭐ {t('premium.title')}
            </span>
          )}
          
          {recipe.proteini >= 25 && (
            <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full font-semibold">
              💪 {t('recipes.high_protein')}
            </span>
          )}
          {recipe.vlakna >= 10 && (
            <span className="inline-block bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 text-xs px-2 py-0.5 rounded-full font-semibold">
              🌾 {t('recipes.high_fiber')}
            </span>
          )}
          
          {recipe.alergeni && recipe.alergeni.length > 0 && (
            <span className="inline-block bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs px-2 py-0.5 rounded-full font-semibold">
              🚫 {recipe.alergeni.length} {t('recipe.restrictions')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

RecipeCard.displayName = 'RecipeCard';

export default RecipeCard;