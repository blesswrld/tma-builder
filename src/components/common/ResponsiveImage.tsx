import React, { useState, useMemo } from "react";
import {
  generatePictureSources,
  generateSrcSet,
  getStandardImageSizes,
  ResponsiveImagePreset,
} from "../../lib/imageOptimization";

export interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "sizes"> {
  src: string;
  alt: string;
  preset?: ResponsiveImagePreset;
  sizes?: string;
  priority?: boolean;
  aspectRatio?: string;
  containerClassName?: string;
  pictureClassName?: string;
  showSkeleton?: boolean;
  fallbackSrc?: string;
}

export const ResponsiveImage = React.memo(function ResponsiveImage({
  src,
  alt,
  preset = "card",
  priority = false,
  className = "w-full h-full object-cover",
  containerClassName = "",
  pictureClassName = "contents",
  sizes,
  aspectRatio,
  showSkeleton = true,
  fallbackSrc,
  referrerPolicy = "no-referrer",
  onError,
  onLoad,
  ...imgProps
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const effectiveSrc = hasError && fallbackSrc ? fallbackSrc : src;
  const standardSizes = sizes || getStandardImageSizes(preset);

  // Compute picture source elements with srcset and format transformations
  const pictureSources = useMemo(() => {
    if (!effectiveSrc) return [];
    return generatePictureSources(effectiveSrc, { preset, customSizes: standardSizes });
  }, [effectiveSrc, preset, standardSizes]);

  // Compute standard srcset for the fallback img element
  const fallbackSrcSet = useMemo(() => {
    if (!effectiveSrc) return undefined;
    return generateSrcSet(effectiveSrc);
  }, [effectiveSrc]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc) {
      setHasError(true);
    }
    if (onError) onError(e);
  };

  if (!effectiveSrc) {
    return null;
  }

  const content = (
    <picture className={pictureClassName}>
      {pictureSources.map((source, index) => (
        <source
          key={index}
          type={source.type}
          media={source.media}
          srcSet={source.srcSet}
          sizes={source.sizes || standardSizes}
        />
      ))}
      <img
        src={effectiveSrc}
        srcSet={fallbackSrcSet || undefined}
        sizes={standardSizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        referrerPolicy={referrerPolicy}
        onLoad={handleImgLoad}
        onError={handleImgError}
        className={`${className} ${!isLoaded && showSkeleton ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
        {...imgProps}
      />
    </picture>
  );

  if (containerClassName || aspectRatio || showSkeleton) {
    return (
      <div
        className={`relative overflow-hidden ${containerClassName}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {showSkeleton && !isLoaded && (
          <div className="absolute inset-0 bg-app-surface animate-pulse pointer-events-none" />
        )}
        {content}
      </div>
    );
  }

  return content;
});

ResponsiveImage.displayName = "ResponsiveImage";
