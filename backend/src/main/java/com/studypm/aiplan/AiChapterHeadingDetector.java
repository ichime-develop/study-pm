package com.studypm.aiplan;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * 目次テキストから明示的な章見出しの概数を検出する。
 */
@Component
final class AiChapterHeadingDetector {

    private static final Pattern ENGLISH_CHAPTER = Pattern.compile(
            "(?im)^\\s*chapter\\s*([0-9０-９]+)(?=\\s|[:：.\\-]|$)"
    );
    private static final Pattern JAPANESE_CHAPTER = Pattern.compile(
            "(?m)^\\s*第\\s*([0-9０-９一二三四五六七八九十百〇零]+)\\s*章"
    );
    private static final Pattern NUMBERED_CHAPTER = Pattern.compile(
            "(?m)^\\s*([0-9０-９]+)\\s*章(?=\\s|[:：.\\-]|$)"
    );

    int count(List<AiWbsGenerationSource> sources) {
        Set<String> chapterKeys = new HashSet<>();
        for (AiWbsGenerationSource source : sources) {
            collect(chapterKeys, source.temporaryKey(), source.textContent(), ENGLISH_CHAPTER);
            collect(chapterKeys, source.temporaryKey(), source.textContent(), JAPANESE_CHAPTER);
            collect(chapterKeys, source.temporaryKey(), source.textContent(), NUMBERED_CHAPTER);
        }
        return chapterKeys.size();
    }

    private void collect(Set<String> chapterKeys, String sourceKey, String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            chapterKeys.add(sourceKey + ":" + normalize(matcher.group(1)));
        }
    }

    private String normalize(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (char character : value.toCharArray()) {
            result.append(character >= '０' && character <= '９'
                    ? (char) ('0' + character - '０')
                    : character);
        }
        return result.toString();
    }
}
