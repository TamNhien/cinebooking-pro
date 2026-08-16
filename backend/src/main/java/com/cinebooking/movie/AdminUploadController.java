package com.cinebooking.movie;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/uploads")
public class AdminUploadController {
    private final PosterStorageService storage;

    public AdminUploadController(PosterStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(value = "/posters", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PosterUploadResponse uploadPoster(@RequestParam("file") MultipartFile file) {
        PosterStorageService.StoredPoster saved = storage.store(file);
        return new PosterUploadResponse(saved.url(), saved.fileName(), saved.size());
    }

    public record PosterUploadResponse(String url, String fileName, long size) {}
}
