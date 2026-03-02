import React, { useState, useEffect } from "react";
import "@styles/PhotosModal.css";

const PhotosModal = ({ show, onClose, photos = [], title }) => {
  const [currentIndex, setCurrentIndex] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex === null) return;

      if (e.key === "Escape") {
        setCurrentIndex(null);
      }

      if (e.key === "ArrowRight") {
        nextImage();
      }

      if (e.key === "ArrowLeft") {
        prevImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  if (!show) return null;

  const nextImage = () => {
    setCurrentIndex((prev) =>
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };

  return (
    <>
      {/* Основная модалка */}
      <div className="photos-modal-overlay" onClick={onClose}>
        <div
          className="photos-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="photos-modal-header">
            <h3>{title || "Фотографії напрямку"}</h3>
            <button className="photos-modal-close" onClick={onClose}>
              ✖
            </button>
          </div>

          <div className="photos-modal-body">
            {photos.length === 0 ? (
              <p>Фотографій поки що немає</p>
            ) : (
              photos.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt=""
                  className="photos-modal-image"
                  onClick={() => setCurrentIndex(index)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {currentIndex !== null && (
        <div className="image-lightbox">
          <button
            className="lightbox-close"
            onClick={() => setCurrentIndex(null)}
          >
            ✖
          </button>

          <button
            className="lightbox-prev"
            onClick={prevImage}
          >
            ←
          </button>

          <img
            src={photos[currentIndex]}
            alt=""
            className="image-lightbox-img"
          />

          <button
            className="lightbox-next"
            onClick={nextImage}
          >
            →
          </button>
        </div>
      )}
    </>
  );
};

export default PhotosModal;