package com.geoimage2cad.pro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Native CAD migration shell. It is not the launcher yet: the existing WebView
 * remains the compatibility surface until feature parity is proven.
 */
class NativeCadActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NativeCadMigrationScreen() }
    }
}

@Composable
private fun NativeCadMigrationScreen() {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("GeoImage2CAD Pro", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Native CAD surface is ready for staged feature parity.",
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
        }
    }
}
