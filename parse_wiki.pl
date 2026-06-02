use open ':std', ':encoding(UTF-8)';

open(my $fh, '<:encoding(EUC-JP)', 'wiki_page.html') or die $!;
my $content = do { local $/; <$fh> };
close $fh;

sub decode_cell {
    my $val = shift;
    $val =~ s{<br class="spacer" />}{\n}gi;
    $val =~ s{<br />}{\n}gi;
    $val =~ s{<[^>]+>}{}g;
    $val =~ s{&amp;}{&}g;
    $val =~ s{&lt;}{<}g;
    $val =~ s{&gt;}{>}g;
    $val =~ s{&nbsp;}{ }g;
    $val =~ s{\A\n+}{}g;
    $val =~ s{\n+\z}{}g;
    return $val;
}

sub json_str {
    my $s = shift;
    $s =~ s{\\}{\\\\}g;
    $s =~ s{"}{\\"}g;
    $s =~ s{\n}{\\n}g;
    return $s;
}

my $year_month = '2026-06';
my $user_name = '';

# ページタイトルから userName を抽出（例: "根本作業ログ(2026/06)" → "根本"）
if ($content =~ m{name="refer"[^>]*value="([^"]+)"}si) {
    my $refer = $1;
    # "作業ログ(YYYY/MM)" を除いた先頭部分が userName
    $refer =~ s{\x{4f5c}\x{696d}\x{30ed}\x{30b0}\(.*}{}s;
    $user_name = $refer;
}

my $table = '';
if ($content =~ m{<div class="ie5">(.*?)<h4>}si) {
    $table = $1;
}

my @rows;
while ($table =~ m{<tr>(.*?)</tr>}gsi) {
    push @rows, $1;
}

my @results;
my $i = 0;
while ($i < scalar @rows) {
    my $row = $rows[$i];
    if ($row =~ m{rowspan="3"[^>]*>(\d+)</td>}s) {
        my $day_num = $1;
        my $date = sprintf('%s-%02d', $year_month, $day_num);
        my %sections;
        for my $j ($i .. $i + 2) {
            last if $j >= scalar @rows;
            my $r = $rows[$j];
            if ($r =~ m{width:120px;">([^<]+)</td><td[^>]*width:520px;">(.*?)</td>}si) {
                my ($label, $val) = ($1, $2);
                $label =~ s{\s+}{}g;
                $sections{$label} = decode_cell($val);
            }
        }
        push @results, {
            userName     => $user_name,
            date         => $date,
            workContent  => $sections{"\x{4f5c}\x{696d}\x{5185}\x{5bb9}"} // '',
            tomorrowPlan => $sections{"\x{660e}\x{65e5}\x{4e88}\x{5b9a}"} // '',
            notes        => $sections{"\x{611f}\x{60f3}/\x{8ab2}\x{984c}/\x{554f}\x{984c}\x{70b9}"} // '',
        };
        $i += 3;
    } else {
        $i++;
    }
}

print "[\n";
for my $k (0 .. $#results) {
    my $e = $results[$k];
    print "  {\n";
    print "    \"userName\": \"" . json_str($e->{userName}) . "\",\n";
    print "    \"date\": \"" . $e->{date} . "\",\n";
    print "    \"workContent\": \"" . json_str($e->{workContent}) . "\",\n";
    print "    \"tomorrowPlan\": \"" . json_str($e->{tomorrowPlan}) . "\",\n";
    print "    \"notes\": \"" . json_str($e->{notes}) . "\"\n";
    print "  }";
    print "," if $k < $#results;
    print "\n";
}
print "]\n";
