package com.cinebooking.movie;

import com.cinebooking.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;

@Service
public class PosterStorageService {
    private static final long MAX_POSTER_BYTES = 5L * 1024 * 1024;
    private final Path movieDir;

    public PosterStorageService(@Value("${app.upload.dir:/app/uploads}") String uploadDir) {
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.movieDir = root.resolve("movies").normalize();
        try {
            Files.createDirectories(movieDir);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo thư mục lưu poster", e);
        }
    }

    public StoredPoster store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ảnh poster.");
        }
        if (file.getSize() > MAX_POSTER_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Poster tối đa 5 MB.");
        }

        String extension;
        try {
            extension = detectImageExtension(file);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không đọc được file ảnh.");
        }
        if (extension == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ JPG, PNG hoặc WebP.");
        }

        String fileName = UUID.randomUUID().toString().toLowerCase(Locale.ROOT) + "." + extension;
        Path target = movieDir.resolve(fileName).normalize();
        if (!target.startsWith(movieDir)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tên file không hợp lệ.");
        }

        try (InputStream in = file.getInputStream()) {
            Path temp = Files.createTempFile(movieDir, ".poster-", ".tmp");
            try {
                Files.copy(in, temp, StandardCopyOption.REPLACE_EXISTING);
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException atomicMoveError) {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu poster. Vui lòng thử lại.");
        }

        return new StoredPoster("/uploads/movies/" + fileName, fileName, file.getSize());
    }

    private String detectImageExtension(MultipartFile file) throws IOException {
        byte[] header = new byte[12];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.read(header);
        }
        if (read >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff) {
            return "jpg";
        }
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (read >= 8 && Arrays.equals(Arrays.copyOf(header, 8), png)) {
            return "png";
        }
        if (read >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return "webp";
        }
        return null;
    }

    public record StoredPoster(String url, String fileName, long size) {}
}
