// frontend/src/components/RecipeCard.jsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LazyImage from './LazyImage';

const RecipeCard = React.memo(({ recipe }) => {
  const { t } = useTranslation();

  // 🔥 KORISTI useMemo ZA IZRAČUN - ne računa se pri svakom renderu
  const nutritionLabel = useMemo(() => {
    const parts = [];
    if (recipe.proteini) parts.push(`💪 ${recipe.proteini}g`);
    if (recipe.vlakna) parts.push(`🌾 ${recipe.vlakna}g`);
    if (recipe.ugljikohidrati) parts.push(`🍞 ${recipe.ugljikohidrati}g`);
    if (recipe.masti) parts.push(`🧈 ${recipe.masti}g`);
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [recipe.proteini, recipe.vlakna, recipe.ugljikohidrati, recipe.masti]);

  // 🔥 KORISTI useMemo ZA TAGOVE
  const tags = useMemo(() => {
    const tagList = [];
    
    if (recipe.premium) {
      tagList.push({
        type: 'premium',
        label: `⭐ ${t('premium.title')}`,
        className: 'bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200'
      });
    }
    
    if (recipe.proteini >= 25) {
      tagList.push({
        type: 'protein',
        label: `💪 ${t('recipes.high_protein')}`,
        className: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
      });
    }
    
    if (recipe.vlakna >= 10) {
      tagList.push({
        type: 'fiber',
        label: `🌾 ${t('recipes.high_fiber')}`,
        className: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
      });
    }
    
    if (recipe.izbjegava && recipe.izbjegava.length > 0) {
      tagList.push({
        type: 'restrictions',
        label: `🚫 ${recipe.izbjegava.length} ${t('recipe.restrictions')}`,
        className: 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
      });
    }
    
    return tagList;
  }, [recipe.premium, recipe.proteini, recipe.vlakna, recipe.izbjegava, t]);

  // 🔥 MEMOIZIRANA DEFAULT SLIKA
  const defaultImage = useMemo(() => {
    return recipe.slika || 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Recept';
  }, [recipe.slika]);

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 group hover:-translate-y-1"
    >
      <LazyImage
        src={defaultImage}
        alt={recipe.naziv}
        className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg dark:text-white line-clamp-1">
          {recipe.naziv}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ⏱️ {recipe.vrijeme || '30 min'} · 🔥 {recipe.kalorije || 0} {t('recipe.kcal')}
        </p>

        {nutritionLabel && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
            {nutritionLabel}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag.type}-${index}`}
              className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${tag.className}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
});

RecipeCard.displayName = 'RecipeCard';

// 🔥 DODAJ CUSTOM COMPARATOR ZA BOLJU KONTROLU RE-RENDERA
RecipeCard.areEqual = (prevProps, nextProps) => {
  // Samo re-render ako se promijenio ID ili važni podaci
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.naziv === nextProps.recipe.naziv &&
    prevProps.recipe.kalorije === nextProps.recipe.kalorije &&
    prevProps.recipe.proteini === nextProps.recipe.proteini &&
    prevProps.recipe.vlakna === nextProps.recipe.vlakna &&
    prevProps.recipe.premium === nextProps.recipe.premium &&
    prevProps.recipe.izbjegava?.length === nextProps.recipe.izbjegava?.length
  );
};

export default RecipeCard;