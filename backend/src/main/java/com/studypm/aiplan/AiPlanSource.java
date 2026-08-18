package com.studypm.aiplan;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * AI生成へ送る概要・目次・OCR修正済み本文を表す。
 */
@Entity
@Table(name = "ai_plan_sources")
public class AiPlanSource {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_plan_generation_request_id", nullable = false)
    private AiPlanGenerationRequest generationRequest;

    @Column(name = "temporary_key", nullable = false, length = 100)
    private String temporaryKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private AiPlanSourceType sourceType;

    @Column(name = "source_order", nullable = false)
    private int sourceOrder;

    @Column(length = 100)
    private String label;

    @Column(name = "text_content", nullable = false, columnDefinition = "text")
    private String textContent;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AiPlanSource() {
    }

    private AiPlanSource(AiPlanGenerationRequest request, AiPlanSourceCommand command, Instant now) {
        this.id = UUID.randomUUID();
        this.generationRequest = request;
        this.temporaryKey = command.temporaryKey();
        this.sourceType = command.sourceType();
        this.sourceOrder = command.sourceOrder();
        this.label = command.label();
        this.textContent = command.textContent();
        this.contentHash = sha256(command.textContent());
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AiPlanSource create(AiPlanGenerationRequest request, AiPlanSourceCommand command, Instant now) {
        return new AiPlanSource(request, command, now);
    }

    public String temporaryKey() { return temporaryKey; }
    public AiPlanSourceType sourceType() { return sourceType; }
    public int sourceOrder() { return sourceOrder; }
    public String label() { return label; }
    public String textContent() { return textContent; }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }
}
