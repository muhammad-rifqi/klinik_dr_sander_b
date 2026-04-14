<?php
$wkhtml = '"C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe"';
$var_name = rand(00000,99999);
$html = "laporan.html";
$output = $var_name.".pdf";

$command = "$wkhtml $html $output";
exec($command);
?>