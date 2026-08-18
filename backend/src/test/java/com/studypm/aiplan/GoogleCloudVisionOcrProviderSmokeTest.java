package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Duration;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * 明示実行時だけGoogle Cloud Vision実サービスで文書OCRできることを確認する。
 */
class GoogleCloudVisionOcrProviderSmokeTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_GOOGLE_VISION_SMOKE_TEST", matches = "true")
    void extractsTextWithTheConfiguredKey() throws Exception {
        String apiKey = System.getenv("GOOGLE_CLOUD_VISION_API_KEY");
        assumeTrue(apiKey != null && !apiKey.isBlank(), "GOOGLE_CLOUD_VISION_API_KEY is required.");
        GoogleCloudVisionOcrProvider provider = new GoogleCloudVisionOcrProvider(
                apiKey,
                "vision.googleapis.com:443",
                Duration.ofSeconds(60),
                1,
                Duration.ofMillis(500)
        );

        try {
            AiOcrProviderResult result = provider.extractDocumentText(testImage());

            assertThat(result.text()).containsIgnoringCase("STUDY PM OCR");
            assertThat(result.detectedPageCount()).isEqualTo(1);
        } finally {
            provider.closeClient();
        }
    }

    private byte[] testImage() throws Exception {
        BufferedImage image = new BufferedImage(1200, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            graphics.setColor(Color.BLACK);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 72));
            graphics.drawString("STUDY PM OCR", 120, 220);
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
