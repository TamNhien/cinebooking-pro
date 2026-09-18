package com.cinebooking.domain;

import jakarta.persistence.*;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Entity
@Table(name="cinema")
public class Cinema {
    /** Historical V48 browser journeys could persist a millisecond/nanosecond stamp
     * after a cinema name. Keep real numeric names such as "Landmark 81" intact by
     * stripping only a standalone suffix of ten or more digits. */
    private static final Pattern TEST_TIMESTAMP_SUFFIX = Pattern.compile("^(.*?)\\s+\\d{10,}$");

    @Id
    private UUID id;
    @Column(nullable=false)
    private String name;
    @Column(nullable=false)
    private String address;

    @PrePersist
    void pre(){if(id==null)id=UUID.randomUUID();}

    public UUID getId(){return id;}
    public void setId(UUID id){this.id=id;}
    public String getName(){return cleanDisplayName(name);}
    public void setName(String name){this.name=cleanDisplayName(name);}
    public String getAddress(){return address;}
    public void setAddress(String address){this.address=address;}

    public static String cleanDisplayName(String value){
        if(value==null)return null;
        String trimmed=value.trim();
        Matcher matcher=TEST_TIMESTAMP_SUFFIX.matcher(trimmed);
        return matcher.matches()?matcher.group(1).trim():trimmed;
    }
}
